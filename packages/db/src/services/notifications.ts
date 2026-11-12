import { DEFAULT_TIME_ZONE } from '@boramarcar/core';
import { and, asc, eq, gte, inArray, isNull, lt, ne } from 'drizzle-orm';
import type { Database } from '../client';
import {
  eventParticipants,
  events,
  groupMembers,
  groups,
  locations,
  user,
  windowNotifications,
} from '../schema';

/** Destinatário de e-mail, com idioma e fuso para formatar a mensagem. */
export interface Recipient {
  userId: string;
  name: string;
  email: string;
  locale: string | null;
  timeZone: string;
}

const recipientColumns = {
  userId: user.id,
  name: user.name,
  email: user.email,
  locale: user.locale,
  timeZone: user.timeZone,
};

const normalize = (rows: { timeZone: string | null }[]) =>
  rows.map((r) => ({ ...r, timeZone: r.timeZone ?? DEFAULT_TIME_ZONE })) as Recipient[];

/**
 * Membros do grupo que recebem o aviso (opcionalmente só alguns, ou excluindo alguém). No
 * e-mail, só quem aceita e-mails; no push, todos (quem não quer não tem token no aparelho).
 */
export async function listGroupRecipients(
  db: Database,
  input: {
    groupId: string;
    excludeUserId?: string;
    onlyUserIds?: string[];
    channel?: 'email' | 'push';
  },
) {
  if (input.onlyUserIds && input.onlyUserIds.length === 0) return [];
  const rows = await db
    .select(recipientColumns)
    .from(groupMembers)
    .innerJoin(user, eq(user.id, groupMembers.userId))
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        input.channel === 'push' ? isNull(user.deletedAt) : eq(user.emailNotifications, true),
        input.excludeUserId ? ne(user.id, input.excludeUserId) : undefined,
        input.onlyUserIds ? inArray(user.id, input.onlyUserIds) : undefined,
      ),
    )
    .orderBy(asc(user.name));
  return normalize(rows);
}

/** Dados do encontro para montar e-mails, com quem deve recebê-los. */
export async function getEventForNotification(
  db: Database,
  input: {
    eventId: string;
    audience: 'group' | 'participants';
    excludeUserId?: string;
    channel?: 'email' | 'push';
  },
) {
  const [row] = await db
    .select({ event: events, groupName: groups.name, location: locations })
    .from(events)
    .innerJoin(groups, eq(groups.id, events.groupId))
    .leftJoin(locations, eq(locations.id, events.locationId))
    .where(eq(events.id, input.eventId))
    .limit(1);
  if (!row) return null;

  const participants = await db
    .select({ userId: user.id, name: user.name, rsvp: eventParticipants.rsvp })
    .from(eventParticipants)
    .innerJoin(user, eq(user.id, eventParticipants.userId))
    .where(eq(eventParticipants.eventId, input.eventId))
    .orderBy(asc(user.name));

  const recipients =
    input.audience === 'group'
      ? await listGroupRecipients(db, {
          groupId: row.event.groupId,
          excludeUserId: input.excludeUserId,
          channel: input.channel,
        })
      : (
          await listGroupRecipients(db, {
            groupId: row.event.groupId,
            onlyUserIds: participants.filter((p) => p.rsvp !== 'no').map((p) => p.userId),
            channel: input.channel,
          })
        ).filter((r) => r.userId !== input.excludeUserId);

  return {
    event: row.event,
    groupName: row.groupName,
    location: row.location ? { name: row.location.name, address: row.location.address } : null,
    confirmed: participants.filter((p) => p.rsvp === 'yes').map((p) => p.name),
    recipients,
  };
}

/** Encontros agendados que começam no intervalo e ainda não tiveram lembrete. */
export async function listEventsNeedingReminder(db: Database, input: { from: Date; to: Date }) {
  return db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.status, 'scheduled'),
        isNull(events.reminderSentAt),
        gte(events.startsAt, input.from),
        lt(events.startsAt, input.to),
      ),
    );
}

/** Marca o lembrete como enviado. Retorna false se outra execução já marcou (evita duplicar). */
export async function claimEventReminder(db: Database, eventId: string) {
  const rows = await db
    .update(events)
    .set({ reminderSentAt: new Date() })
    .where(and(eq(events.id, eventId), isNull(events.reminderSentAt)))
    .returning({ id: events.id });
  return rows.length > 0;
}

/** Registra que uma janela "a mesa fechou!" foi avisada. Retorna false se já tinha sido. */
export async function claimWindowNotification(
  db: Database,
  input: { groupId: string; key: string },
) {
  const rows = await db
    .insert(windowNotifications)
    .values(input)
    .onConflictDoNothing()
    .returning({ key: windowNotifications.key });
  return rows.length > 0;
}

/** Nome do grupo, para o texto dos e-mails. */
export async function getGroupName(db: Database, groupId: string) {
  const [row] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return row?.name ?? null;
}

/** Campos do encontro que, se mudarem, geram aviso (lidos antes de editar). */
export async function getEventSnapshot(db: Database, eventId: string) {
  const [row] = await db
    .select({
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      locationId: events.locationId,
      status: events.status,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return row ?? null;
}
