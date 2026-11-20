import { DomainError, isGameFormat } from '@boramarcar/core';
import {
  STORE_EVENT_KINDS,
  entryStatusFor,
  eventCode,
  normalizeEventCode,
  promoteFromWaitlist,
  type StoreEntryStatus,
  type StoreEventKind,
} from '@boramarcar/core/stores';
import { and, asc, desc, eq, gte, inArray, isNotNull, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { isUniqueViolation } from '../db-errors';
import { storeEventEntries, storeEvents, stores, tournaments, user } from '../schema';
import { addNotifications } from './inbox';
import { notifyFollowersOfEvent } from './store-followers';
import { requireStoreRole } from './stores';

/**
 * Eventos de loja (10.2a): a equipe publica na agenda da loja; quem tem conta se inscreve pelo
 * site/app ou pelo código do balcão; a equipe inscreve convidados (só o nome) e faz o check-in.
 * Vagas com lista de espera: quem desiste (ou mais vagas) sobe o primeiro da fila.
 */

type EventRow = typeof storeEvents.$inferSelect;

async function loadEvent(db: Database, eventId: string) {
  const [row] = await db.select().from(storeEvents).where(eq(storeEvents.id, eventId)).limit(1);
  if (!row) throw new DomainError('not_found', 'Evento não encontrado');
  return row;
}

const requireStaff = (db: Database, event: EventRow, userId: string) =>
  requireStoreRole(db, event.storeId, userId, ['owner', 'staff']);

function checkFields(input: {
  title?: string;
  format?: string;
  kind?: string;
  capacity?: number | null;
  prizes?: string | null;
  rules?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
}) {
  const bad = (message: string) => new DomainError('invalid_input', message);
  if (input.title !== undefined && (!input.title.trim() || input.title.trim().length > 120)) {
    throw bad('Título inválido');
  }
  if (input.format !== undefined && !isGameFormat(input.format)) throw bad('Formato inválido');
  if (input.kind !== undefined && !(STORE_EVENT_KINDS as readonly string[]).includes(input.kind)) {
    throw bad('Tipo inválido');
  }
  if (
    input.capacity !== undefined &&
    input.capacity !== null &&
    (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 512)
  ) {
    throw bad('Vagas inválidas');
  }
  for (const text of [input.prizes, input.rules]) {
    if (text && text.length > 2000) throw bad('Texto longo demais');
  }
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    throw bad('O fim precisa ser depois do início');
  }
}

/** Novo evento na agenda da loja (equipe). Gera o código do balcão. */
export async function createStoreEvent(
  db: Database,
  input: {
    storeId: string;
    userId: string;
    title: string;
    startsAt: Date;
    endsAt?: Date | null;
    format: string;
    kind: StoreEventKind;
    capacity?: number | null;
    prizes?: string | null;
    rules?: string | null;
  },
) {
  await requireStoreRole(db, input.storeId, input.userId, ['owner', 'staff']);
  checkFields(input);
  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db
        .insert(storeEvents)
        .values({
          storeId: input.storeId,
          title: input.title.trim(),
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          format: input.format,
          kind: input.kind,
          capacity: input.capacity ?? null,
          code: eventCode(),
          prizes: input.prizes?.trim() || null,
          rules: input.rules?.trim() || null,
          createdBy: input.userId,
        })
        .returning();
      // Quem segue a loja (10.4) fica sabendo no sino.
      await notifyFollowersOfEvent(db, { storeId: input.storeId, storeEventId: row!.id });
      return row!;
    } catch (error) {
      // Código repetido (raro): tenta outro.
      if (attempt < 4 && String(error).includes('store_events_code')) continue;
      throw error;
    }
  }
}

/**
 * Sobe da lista de espera quem cabe nas vagas (depois de uma desistência ou de mais vagas). Chame
 * dentro da transação que travou o evento (`lockEvent`).
 */
async function promote(db: Database, event: EventRow) {
  const entries = await db
    .select({
      id: storeEventEntries.id,
      status: storeEventEntries.status,
      createdAt: storeEventEntries.createdAt,
    })
    .from(storeEventEntries)
    .where(eq(storeEventEntries.storeEventId, event.id));
  const ids = promoteFromWaitlist(
    entries.map((e) => ({ ...e, status: e.status as StoreEntryStatus })),
    event.capacity,
  );
  if (ids.length) {
    await db
      .update(storeEventEntries)
      .set({ status: 'registered' })
      .where(inArray(storeEventEntries.id, ids));
    // Quem tem conta recebe o aviso no sino (convidado não tem).
    const promoted = await db
      .select({ userId: storeEventEntries.userId })
      .from(storeEventEntries)
      .where(and(inArray(storeEventEntries.id, ids), isNotNull(storeEventEntries.userId)));
    await addNotifications(
      db,
      promoted.map((p) => ({
        userId: p.userId!,
        groupId: null,
        data: { kind: 'store_event' as const, storeEventId: event.id, event: 'promoted' as const },
      })),
    );
  }
}

/** Edita o evento (equipe). Mais vagas sobem a lista de espera. */
export async function updateStoreEvent(
  db: Database,
  input: {
    eventId: string;
    userId: string;
    title?: string;
    startsAt?: Date;
    endsAt?: Date | null;
    format?: string;
    kind?: StoreEventKind;
    capacity?: number | null;
    prizes?: string | null;
    rules?: string | null;
  },
) {
  const event = await loadEvent(db, input.eventId);
  await requireStaff(db, event, input.userId);
  checkFields({ ...input, startsAt: input.startsAt ?? event.startsAt });
  const set = {
    title: input.title?.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    format: input.format,
    kind: input.kind,
    capacity: input.capacity,
    prizes: input.prizes === undefined ? undefined : input.prizes?.trim() || null,
    rules: input.rules === undefined ? undefined : input.rules?.trim() || null,
  };
  await db.transaction(async (tx) => {
    await lockEvent(tx, event.id);
    const [updated] = await tx
      .update(storeEvents)
      .set(Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined)))
      .where(eq(storeEvents.id, event.id))
      .returning();
    await promote(tx, updated!);
  });
}

/** Cancela o evento (equipe): some da inscrição; a página mostra que foi cancelado. */
export async function cancelStoreEvent(db: Database, input: { eventId: string; userId: string }) {
  const event = await loadEvent(db, input.eventId);
  await requireStaff(db, event, input.userId);
  await db.update(storeEvents).set({ status: 'cancelled' }).where(eq(storeEvents.id, event.id));
}

/** Agenda da loja: próximos (mais cedo primeiro) ou passados (mais recentes primeiro). */
export async function listStoreEvents(
  db: Database,
  input: { storeId: string; when: 'upcoming' | 'past'; now?: Date; limit?: number },
) {
  const now = input.now ?? new Date();
  const rows = await db
    .select({
      id: storeEvents.id,
      title: storeEvents.title,
      startsAt: storeEvents.startsAt,
      format: storeEvents.format,
      kind: storeEvents.kind,
      capacity: storeEvents.capacity,
      status: storeEvents.status,
    })
    .from(storeEvents)
    .where(
      and(
        eq(storeEvents.storeId, input.storeId),
        input.when === 'upcoming' ? gte(storeEvents.startsAt, now) : lt(storeEvents.startsAt, now),
      ),
    )
    .orderBy(input.when === 'upcoming' ? asc(storeEvents.startsAt) : desc(storeEvents.startsAt))
    .limit(input.limit ?? 20);
  return rows;
}

async function counts(db: Database, eventId: string) {
  const entries = await db
    .select({ status: storeEventEntries.status })
    .from(storeEventEntries)
    .where(eq(storeEventEntries.storeEventId, eventId));
  return {
    registered: entries.filter((e) => e.status === 'registered').length,
    waitlist: entries.filter((e) => e.status === 'waitlist').length,
  };
}

/**
 * Página pública do evento: dados, vagas (contagem, sem nomes) e a inscrição de quem vê. O
 * código do balcão fica só para a equipe. `null` se não existe.
 */
export async function getStoreEventPublic(
  db: Database,
  input: { eventId: string; viewerId?: string | null },
) {
  const [row] = await db
    .select({ event: storeEvents, storeName: stores.name, storeSlug: stores.slug })
    .from(storeEvents)
    .innerJoin(stores, eq(stores.id, storeEvents.storeId))
    .where(eq(storeEvents.id, input.eventId))
    .limit(1);
  if (!row) return null;
  const { code: _code, createdBy: _by, ...event } = row.event;
  const [c, mine] = await Promise.all([
    counts(db, event.id),
    input.viewerId
      ? db
          .select({ id: storeEventEntries.id, status: storeEventEntries.status })
          .from(storeEventEntries)
          .where(
            and(
              eq(storeEventEntries.storeEventId, event.id),
              eq(storeEventEntries.userId, input.viewerId),
            ),
          )
          .limit(1)
      : [],
  ]);
  return {
    ...event,
    store: { name: row.storeName, slug: row.storeSlug },
    ...c,
    myEntry: mine[0] ? { id: mine[0].id, status: mine[0].status as StoreEntryStatus } : null,
  };
}
export type StoreEventPublic = NonNullable<Awaited<ReturnType<typeof getStoreEventPublic>>>;

/**
 * Trava o evento até o fim da transação: inscrições, desistências e subidas da fila do mesmo
 * evento passam uma de cada vez (sem isso, duas inscrições na última vaga entravam as duas).
 * Devolve a linha relida (status e vagas atuais).
 */
async function lockEvent(db: Database, eventId: string) {
  const [row] = await db
    .select()
    .from(storeEvents)
    .where(eq(storeEvents.id, eventId))
    .for('update');
  if (!row) throw new DomainError('not_found', 'Evento não encontrado');
  return row;
}

async function register(
  db: Database,
  loaded: EventRow,
  entry: { userId: string | null; guestName: string | null },
) {
  try {
    return await db.transaction(async (tx) => registerLocked(tx, loaded.id, entry));
  } catch (error) {
    // A outra aba ou o clique duplo chegou primeiro e bateu no índice único (evento + pessoa).
    if (isUniqueViolation(error)) {
      throw new DomainError('conflict', 'Você já está inscrito neste evento');
    }
    throw error;
  }
}

async function registerLocked(
  db: Database,
  eventId: string,
  entry: { userId: string | null; guestName: string | null },
) {
  const event = await lockEvent(db, eventId);
  if (event.status !== 'scheduled') {
    throw new DomainError('conflict', 'Este evento não está aberto para inscrição');
  }
  // Com o torneio começado, a inscrição fecha (as mesas já foram montadas).
  const [started] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.storeEventId, event.id))
    .limit(1);
  if (started) throw new DomainError('conflict', 'As inscrições fecharam: o torneio já começou');
  if (entry.userId) {
    const [already] = await db
      .select({ id: storeEventEntries.id })
      .from(storeEventEntries)
      .where(
        and(
          eq(storeEventEntries.storeEventId, event.id),
          eq(storeEventEntries.userId, entry.userId),
        ),
      )
      .limit(1);
    if (already) throw new DomainError('conflict', 'Você já está inscrito neste evento');
  }
  const { registered } = await counts(db, event.id);
  const [row] = await db
    .insert(storeEventEntries)
    .values({
      storeEventId: event.id,
      userId: entry.userId,
      guestName: entry.guestName,
      status: entryStatusFor(registered, event.capacity),
    })
    .returning();
  const [store] = await db
    .select({ slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, event.storeId));
  return {
    id: row!.id,
    eventId: event.id,
    slug: store!.slug,
    status: row!.status as StoreEntryStatus,
  };
}

/** Inscrição de quem tem conta (pelo site/app). Sem vaga, entra na lista de espera. */
export async function registerForStoreEvent(
  db: Database,
  input: { eventId: string; userId: string },
) {
  return register(db, await loadEvent(db, input.eventId), {
    userId: input.userId,
    guestName: null,
  });
}

/** Inscrição pelo código do balcão. */
export async function registerByCode(db: Database, input: { code: string; userId: string }) {
  const code = normalizeEventCode(input.code);
  const [event] = code
    ? await db.select().from(storeEvents).where(eq(storeEvents.code, code)).limit(1)
    : [];
  if (!event) throw new DomainError('not_found', 'Código não encontrado');
  return register(db, event, { userId: input.userId, guestName: null });
}

/** Convidado sem conta, inscrito pela equipe só com o nome. */
export async function addGuestEntry(
  db: Database,
  input: { eventId: string; userId: string; name: string },
) {
  const event = await loadEvent(db, input.eventId);
  await requireStaff(db, event, input.userId);
  const name = input.name.trim();
  if (!name || name.length > 60) throw new DomainError('invalid_input', 'Nome inválido');
  return register(db, event, { userId: null, guestName: name });
}

async function loadEntry(db: Database, entryId: string) {
  const [entry] = await db
    .select()
    .from(storeEventEntries)
    .where(eq(storeEventEntries.id, entryId))
    .limit(1);
  if (!entry) throw new DomainError('not_found', 'Inscrição não encontrada');
  return { entry, event: await loadEvent(db, entry.storeEventId) };
}

/** Desiste (a própria pessoa) ou tira a inscrição (equipe). A vaga vai para o primeiro da fila. */
export async function cancelStoreEntry(db: Database, input: { entryId: string; userId: string }) {
  const { entry, event } = await loadEntry(db, input.entryId);
  if (entry.userId !== input.userId) await requireStaff(db, event, input.userId);
  await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, event.id);
    await tx.delete(storeEventEntries).where(eq(storeEventEntries.id, entry.id));
    await promote(tx, locked);
  });
}

/** Check-in na chegada (equipe). */
export async function setCheckIn(
  db: Database,
  input: { entryId: string; userId: string; checkedIn: boolean; now?: Date },
) {
  const { entry, event } = await loadEntry(db, input.entryId);
  await requireStaff(db, event, input.userId);
  await db
    .update(storeEventEntries)
    .set({ checkedInAt: input.checkedIn ? (input.now ?? new Date()) : null })
    .where(eq(storeEventEntries.id, entry.id));
}

/** Visão da equipe: o código do balcão e a lista completa (contas e convidados, check-in). */
export async function getStoreEventForStaff(
  db: Database,
  input: { eventId: string; userId: string },
) {
  const event = await loadEvent(db, input.eventId);
  await requireStaff(db, event, input.userId);
  const rows = await db
    .select({
      id: storeEventEntries.id,
      userId: storeEventEntries.userId,
      guestName: storeEventEntries.guestName,
      userName: user.name,
      status: storeEventEntries.status,
      checkedInAt: storeEventEntries.checkedInAt,
      createdAt: storeEventEntries.createdAt,
    })
    .from(storeEventEntries)
    .leftJoin(user, eq(user.id, storeEventEntries.userId))
    .where(eq(storeEventEntries.storeEventId, event.id))
    .orderBy(asc(storeEventEntries.createdAt));
  return {
    code: event.code,
    entries: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.userName ?? r.guestName ?? '—',
      guest: !r.userId,
      status: r.status as StoreEntryStatus,
      checkedInAt: r.checkedInAt,
    })),
  };
}

/** Próximos eventos de loja em que a pessoa está inscrita (ou na fila), mais cedo primeiro. */
export async function listMyStoreEntries(db: Database, input: { userId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const rows = await db
    .select({
      entryId: storeEventEntries.id,
      status: storeEventEntries.status,
      eventId: storeEvents.id,
      title: storeEvents.title,
      startsAt: storeEvents.startsAt,
      format: storeEvents.format,
      kind: storeEvents.kind,
      storeName: stores.name,
      slug: stores.slug,
    })
    .from(storeEventEntries)
    .innerJoin(storeEvents, eq(storeEvents.id, storeEventEntries.storeEventId))
    .innerJoin(stores, eq(stores.id, storeEvents.storeId))
    .where(
      and(
        eq(storeEventEntries.userId, input.userId),
        eq(storeEvents.status, 'scheduled'),
        gte(storeEvents.startsAt, now),
      ),
    )
    .orderBy(asc(storeEvents.startsAt));
  return rows.map((r) => ({
    entryId: r.entryId,
    status: r.status as StoreEntryStatus,
    event: { id: r.eventId, title: r.title, startsAt: r.startsAt, format: r.format, kind: r.kind },
    store: { name: r.storeName, slug: r.slug },
  }));
}
