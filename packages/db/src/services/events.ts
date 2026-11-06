import {
  DomainError,
  formatRules,
  isGameFormat,
  validateGame,
  type GameFormat,
  type GamePlayerInput,
} from '@boramarcar/core';
import { and, asc, desc, eq, gte, ilike, inArray, lt, max, ne, or, sql } from 'drizzle-orm';
import type { Database } from '../client';
import {
  decks,
  eventParticipants,
  events,
  gamePlayers,
  games,
  groupMembers,
  locations,
  user,
} from '../schema';
import { getDeckCovers } from './decks';
import { requireMembership } from './groups';

type RsvpStatus = (typeof eventParticipants.$inferSelect)['rsvp'];

async function assertAllMembers(db: Database, groupId: string, userIds: string[]) {
  if (!userIds.length) return;
  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.userId, userIds)));
  if (rows.length !== new Set(userIds).size) {
    throw new DomainError('invalid_input', 'Todos os jogadores precisam participar do grupo');
  }
}

export interface CreateEventInput {
  groupId: string;
  userId: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  locationId?: string | null;
  participantIds?: string[];
}

export async function createEvent(db: Database, input: CreateEventInput) {
  await requireMembership(db, input.groupId, input.userId);
  const title = input.title.trim();
  if (!title) throw new DomainError('invalid_input', 'Informe um título');
  if (input.endsAt && input.endsAt <= input.startsAt) {
    throw new DomainError('invalid_input', 'O fim deve ser depois do início');
  }
  if (input.locationId) {
    const [location] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, input.locationId), eq(locations.groupId, input.groupId)));
    if (!location) throw new DomainError('invalid_input', 'Local inválido para este grupo');
  }
  const participantIds = [...new Set([input.userId, ...(input.participantIds ?? [])])];
  await assertAllMembers(db, input.groupId, participantIds);

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        groupId: input.groupId,
        title,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        locationId: input.locationId ?? null,
        createdBy: input.userId,
      })
      .returning();
    await tx
      .insert(eventParticipants)
      .values(
        participantIds.map((userId) => ({ eventId: event!.id, userId, rsvp: 'yes' as const })),
      );
    return event!;
  });
}

export async function listEvents(
  db: Database,
  input: {
    groupId: string;
    userId: string;
    when?: 'upcoming' | 'past';
    now?: Date;
    includeCancelled?: boolean;
  },
) {
  await requireMembership(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const timeFilter =
    input.when === 'past'
      ? lt(events.startsAt, now)
      : input.when === 'upcoming'
        ? gte(events.startsAt, now)
        : undefined;
  return db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
      locationId: events.locationId,
      locationName: locations.name,
    })
    .from(events)
    .leftJoin(locations, eq(locations.id, events.locationId))
    .where(
      and(
        eq(events.groupId, input.groupId),
        timeFilter,
        input.includeCancelled === false ? ne(events.status, 'cancelled') : undefined,
      ),
    )
    .orderBy(input.when === 'past' ? desc(events.startsAt) : asc(events.startsAt));
}

async function requireEvent(db: Database, eventId: string, userId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new DomainError('not_found', 'Evento não encontrado');
  const membership = await requireMembership(db, event.groupId, userId);
  return {
    event,
    role: membership.role,
    canManage: event.createdBy === userId || membership.role !== 'member',
  };
}

type EventStatus = (typeof events.$inferSelect)['status'];

export interface UpdateEventInput {
  eventId: string;
  userId: string;
  title?: string;
  startsAt?: Date;
  endsAt?: Date | null;
  locationId?: string | null;
  status?: EventStatus;
}

/** Edita, cancela, finaliza ou reabre um encontro. Só quem criou ou dono/admin do grupo. */
export async function updateEvent(db: Database, input: UpdateEventInput) {
  const { event, canManage } = await requireEvent(db, input.eventId, input.userId);
  if (!canManage)
    throw new DomainError('forbidden', 'Só quem criou o encontro ou um admin pode alterá-lo');

  const changes: Partial<typeof events.$inferInsert> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new DomainError('invalid_input', 'Informe um título');
    changes.title = title;
  }
  if (input.startsAt !== undefined) {
    changes.startsAt = input.startsAt;
    // Remarcado: o lembrete do dia volta a valer para a nova data.
    if (input.startsAt.getTime() !== event.startsAt.getTime()) changes.reminderSentAt = null;
  }
  if (input.endsAt !== undefined) changes.endsAt = input.endsAt;
  const startsAt = changes.startsAt ?? event.startsAt;
  const endsAt = changes.endsAt === undefined ? event.endsAt : changes.endsAt;
  if (endsAt && endsAt <= startsAt)
    throw new DomainError('invalid_input', 'O fim deve ser depois do início');

  if (input.locationId !== undefined) {
    if (input.locationId) {
      const [location] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.groupId, event.groupId)));
      if (!location) throw new DomainError('invalid_input', 'Local inválido para este grupo');
    }
    changes.locationId = input.locationId;
  }
  if (input.status !== undefined) changes.status = input.status;
  if (Object.keys(changes).length === 0) return event;

  const [updated] = await db
    .update(events)
    .set({ ...changes, sequence: event.sequence + 1, updatedAt: new Date() })
    .where(eq(events.id, event.id))
    .returning();
  return updated!;
}

export async function getEventDetail(db: Database, input: { eventId: string; userId: string }) {
  const { event, canManage } = await requireEvent(db, input.eventId, input.userId);
  const [location] = event.locationId
    ? await db.select().from(locations).where(eq(locations.id, event.locationId))
    : [];

  const participants = await db
    .select({ userId: user.id, name: user.name, image: user.image, rsvp: eventParticipants.rsvp })
    .from(eventParticipants)
    .innerJoin(user, eq(user.id, eventParticipants.userId))
    .where(eq(eventParticipants.eventId, event.id))
    .orderBy(asc(user.name));

  const gameRows = await db
    .select()
    .from(games)
    .where(eq(games.eventId, event.id))
    .orderBy(asc(games.number));
  const playerRows = gameRows.length
    ? await db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          name: user.name,
          result: gamePlayers.result,
          seat: gamePlayers.seat,
          team: gamePlayers.team,
          eliminatedOrder: gamePlayers.eliminatedOrder,
          deckId: gamePlayers.deckId,
          deckName: decks.name,
        })
        .from(gamePlayers)
        .innerJoin(user, eq(user.id, gamePlayers.userId))
        .leftJoin(decks, eq(decks.id, gamePlayers.deckId))
        .where(
          inArray(
            gamePlayers.gameId,
            gameRows.map((g) => g.id),
          ),
        )
    : [];

  const covers = await getDeckCovers(
    db,
    playerRows.flatMap((p) => (p.deckId ? [p.deckId] : [])),
  );
  const membership = await requireMembership(db, event.groupId, input.userId);

  return {
    ...event,
    canManage,
    location: location ?? null,
    participants,
    games: gameRows.map((game) => {
      const players = playerRows
        .filter((p) => p.gameId === game.id)
        .map((p) => ({ ...p, deck: p.deckId ? (covers.get(p.deckId) ?? null) : null }))
        .sort(
          (a, b) =>
            (a.team ?? 0) - (b.team ?? 0) ||
            (a.seat ?? 99) - (b.seat ?? 99) ||
            a.name.localeCompare(b.name),
        );
      const winners = players.filter((p) => p.result === 'win');
      return {
        ...game,
        players,
        winners,
        /** Compatibilidade: o vencedor quando há um só. */
        winner: winners.length === 1 ? winners[0]! : null,
        isDraw: winners.length === 0,
        firstPlayerName: players.find((p) => p.userId === game.firstPlayerId)?.name ?? null,
        canEdit: game.createdBy === input.userId || membership.role !== 'member',
      };
    }),
  };
}

export async function setRsvp(
  db: Database,
  input: { eventId: string; userId: string; rsvp: RsvpStatus },
) {
  await requireEvent(db, input.eventId, input.userId);
  await db
    .insert(eventParticipants)
    .values({ eventId: input.eventId, userId: input.userId, rsvp: input.rsvp })
    .onConflictDoUpdate({
      target: [eventParticipants.eventId, eventParticipants.userId],
      set: { rsvp: input.rsvp, updatedAt: new Date() },
    });
}

export interface GameInput {
  players: GamePlayerInput[];
  /** Sem formato, vale o padrão do grupo. */
  format?: GameFormat;
  firstPlayerId?: string | null;
  winningTurn?: number | null;
  durationMinutes?: number | null;
  playedAt?: Date;
  notes?: string | null;
}

export interface RecordGameInput extends GameInput {
  eventId: string;
  userId: string;
}

/** Valida regras do formato, participação no grupo e dono de cada deck. */
async function prepareGame(db: Database, groupId: string, defaultFormat: string, input: GameInput) {
  const format = input.format ?? (isGameFormat(defaultFormat) ? defaultFormat : 'commander');
  const rules = formatRules(format);
  const players = input.players.map((p) => ({
    ...p,
    team: rules.structure === 'teams' ? (p.team ?? null) : null,
  }));
  validateGame({ ...input, format, players });
  await assertAllMembers(
    db,
    groupId,
    players.map((p) => p.userId),
  );

  const deckChecks = players.filter((p) => p.deckId);
  if (deckChecks.length) {
    const owned = await db
      .select({ id: decks.id, ownerId: decks.ownerId })
      .from(decks)
      .where(
        inArray(
          decks.id,
          deckChecks.map((p) => p.deckId!),
        ),
      );
    for (const player of deckChecks) {
      const deck = owned.find((d) => d.id === player.deckId);
      if (!deck || deck.ownerId !== player.userId) {
        throw new DomainError('invalid_input', 'O deck informado não pertence ao jogador');
      }
    }
  }

  return {
    game: {
      format,
      firstPlayerId: input.firstPlayerId ?? null,
      winningTurn: input.winningTurn ?? null,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes?.trim() || null,
    },
    players: players.map((p) => ({
      userId: p.userId,
      result: p.result,
      deckId: p.deckId ?? null,
      seat: p.seat ?? null,
      team: p.team,
      eliminatedOrder: p.eliminatedOrder ?? null,
    })),
  };
}

export async function recordGame(db: Database, input: RecordGameInput) {
  const { event } = await requireEvent(db, input.eventId, input.userId);
  if (event.status === 'cancelled') throw new DomainError('conflict', 'Evento cancelado');
  const group = await requireMembership(db, event.groupId, input.userId);
  const prepared = await prepareGame(db, event.groupId, group.defaultFormat, input);

  return db.transaction(async (tx) => {
    const [{ value: lastNumber } = { value: 0 }] = await tx
      .select({ value: max(games.number) })
      .from(games)
      .where(eq(games.eventId, event.id));
    const [game] = await tx
      .insert(games)
      .values({
        ...prepared.game,
        eventId: event.id,
        groupId: event.groupId,
        number: (lastNumber ?? 0) + 1,
        playedAt: input.playedAt ?? new Date(),
        createdBy: input.userId,
      })
      .returning();
    await tx.insert(gamePlayers).values(prepared.players.map((p) => ({ ...p, gameId: game!.id })));
    return game!;
  });
}

async function requireGameEditor(db: Database, gameId: string, userId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new DomainError('not_found', 'Partida não encontrada');
  const membership = await requireMembership(db, game.groupId, userId);
  if (game.createdBy !== userId && membership.role === 'member') {
    throw new DomainError('forbidden', 'Só quem registrou ou um admin pode alterar a partida');
  }
  return { game, group: membership };
}

/** Edita a partida (2.5): troca jogadores, resultado, decks e detalhes de uma vez. */
export async function updateGame(
  db: Database,
  input: GameInput & { gameId: string; userId: string },
) {
  const { game, group } = await requireGameEditor(db, input.gameId, input.userId);
  const prepared = await prepareGame(
    db,
    game.groupId,
    input.format ?? game.format ?? group.defaultFormat,
    {
      ...input,
      format: input.format ?? (isGameFormat(game.format) ? game.format : undefined),
    },
  );
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(games)
      .set({ ...prepared.game, playedAt: input.playedAt ?? game.playedAt })
      .where(eq(games.id, game.id))
      .returning();
    await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, game.id));
    await tx.insert(gamePlayers).values(prepared.players.map((p) => ({ ...p, gameId: game.id })));
    return updated!;
  });
}

export async function deleteGame(db: Database, input: { gameId: string; userId: string }) {
  const { game } = await requireGameEditor(db, input.gameId, input.userId);
  await db.delete(games).where(eq(games.id, game.id));
}

export const EVENT_HISTORY_PAGE_SIZE = 20;

export interface EventHistoryFilters {
  /** Texto no título ou no nome do local. */
  q?: string;
  status?: 'scheduled' | 'finished' | 'cancelled';
  /** Encontros em que a pessoa confirmou presença ou jogou. */
  playerId?: string;
  page?: number;
}

/**
 * Histórico de encontros (2.10): encontros passados do grupo com busca por texto, situação e
 * jogador, paginados (mais recentes primeiro), com número de partidas, presenças e vencedores.
 */
export async function searchEventHistory(
  db: Database,
  input: EventHistoryFilters & { groupId: string; userId: string; now?: Date },
) {
  await requireMembership(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const q = input.q?.trim();
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const gamesCount = sql<number>`(select count(*)::int from ${games} where ${games.eventId} = ${events.id})`;
  const attendees = sql<number>`(select count(*)::int from ${eventParticipants} where ${eventParticipants.eventId} = ${events.id} and ${eventParticipants.rsvp} = 'yes')`;
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
      locationName: locations.name,
      games: gamesCount,
      attendees,
      total: sql<number>`count(*) over ()::int`,
    })
    .from(events)
    .leftJoin(locations, eq(locations.id, events.locationId))
    .where(
      and(
        eq(events.groupId, input.groupId),
        lt(events.startsAt, now),
        like ? or(ilike(events.title, like), ilike(locations.name, like)) : undefined,
        input.status ? eq(events.status, input.status) : undefined,
        input.playerId
          ? or(
              sql`exists (select 1 from ${eventParticipants} where ${eventParticipants.eventId} = ${events.id} and ${eventParticipants.userId} = ${input.playerId} and ${eventParticipants.rsvp} = 'yes')`,
              sql`exists (select 1 from ${gamePlayers} join ${games} on ${games.id} = ${gamePlayers.gameId} where ${games.eventId} = ${events.id} and ${gamePlayers.userId} = ${input.playerId})`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(events.startsAt))
    .limit(EVENT_HISTORY_PAGE_SIZE)
    .offset((page - 1) * EVENT_HISTORY_PAGE_SIZE);

  const ids = rows.map((r) => r.id);
  const winners = ids.length
    ? await db
        .selectDistinct({ eventId: games.eventId, name: user.name })
        .from(gamePlayers)
        .innerJoin(games, eq(games.id, gamePlayers.gameId))
        .innerJoin(user, eq(user.id, gamePlayers.userId))
        .where(and(inArray(games.eventId, ids), eq(gamePlayers.result, 'win')))
    : [];
  const total = rows[0]?.total ?? 0;
  return {
    page,
    pageSize: EVENT_HISTORY_PAGE_SIZE,
    total,
    pages: Math.max(1, Math.ceil(total / EVENT_HISTORY_PAGE_SIZE)),
    items: rows.map(({ total: _total, ...row }) => ({
      ...row,
      winners: winners
        .filter((w) => w.eventId === row.id)
        .map((w) => w.name)
        .sort((a, b) => a.localeCompare(b)),
    })),
  };
}
