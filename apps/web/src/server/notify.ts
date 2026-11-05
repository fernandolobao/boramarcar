import 'server-only';
import { DEFAULT_TIME_ZONE, windowNotificationKey } from '@boramarcar/core';
import {
  claimEventReminder,
  claimWindowNotification,
  getEventForNotification,
  getGroupName,
  listEvents,
  listEventsNeedingReminder,
  listGroupRecipients,
  suggestGameWindows,
  type Database,
} from '@boramarcar/db';
import { buildEventEmail, buildWindowEmail, deliverEmails, type EventEmailKind } from './email';
import { eventIcs } from './event-ics';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Avisa sobre um encontro: novo (grupo todo), alterado/cancelado (quem não recusou) ou lembrete. */
export async function notifyEvent(
  db: Database,
  input: { eventId: string; kind: EventEmailKind; actorId?: string },
) {
  const data = await getEventForNotification(db, {
    eventId: input.eventId,
    audience: input.kind === 'created' ? 'group' : 'participants',
    excludeUserId: input.actorId,
  });
  if (!data || data.recipients.length === 0) return [];
  const ics = eventIcs({ ...data.event, location: data.location, confirmed: data.confirmed });
  return deliverEmails(
    data.recipients.map((recipient) =>
      buildEventEmail(recipient, {
        kind: input.kind,
        groupName: data.groupName,
        event: data.event,
        location: data.location,
        confirmed: data.confirmed,
        ics,
      }),
    ),
  );
}

export interface EventSnapshot {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  locationId: string | null;
  status: 'scheduled' | 'cancelled' | 'finished';
}

/** Que aviso uma edição merece: cancelado, alterado (título, horário, local, reaberto) ou nenhum. */
export function eventChangeKind(before: EventSnapshot, next: EventSnapshot) {
  if (next.status === 'cancelled') return before.status === 'cancelled' ? null : 'cancelled';
  if (next.status === 'finished') return null;
  const time = (d: Date | null) => d?.getTime() ?? null;
  const changed =
    before.status !== next.status ||
    before.title !== next.title ||
    time(before.startsAt) !== time(next.startsAt) ||
    time(before.endsAt) !== time(next.endsAt) ||
    before.locationId !== next.locationId;
  return changed ? 'updated' : null;
}

/** Quantas janelas "a mesa fechou!" avisar por vez, para não lotar a caixa de entrada. */
const MAX_WINDOWS_PER_CHANGE = 3;

/**
 * Depois de alguém marcar disponibilidade: se surgiram janelas em que a mesa fecha nos próximos
 * 14 dias (e ainda não há encontro marcado nelas), avisa o grupo uma única vez por dia e local.
 */
export async function notifyNewWindows(
  db: Database,
  input: { groupId: string; actorId: string; now?: Date },
) {
  const from = input.now ?? new Date();
  const to = new Date(from.getTime() + 14 * DAY);
  const [windows, upcoming] = await Promise.all([
    suggestGameWindows(db, { groupId: input.groupId, userId: input.actorId, from, to }),
    listEvents(db, {
      groupId: input.groupId,
      userId: input.actorId,
      when: 'upcoming',
      now: new Date(from.getTime() - DAY),
      includeCancelled: false,
    }),
  ]);
  const overlapsEvent = (start: Date, end: Date) =>
    upcoming.some((e) => {
      const eventEnd = e.endsAt ?? new Date(e.startsAt.getTime() + 4 * HOUR);
      return e.startsAt < end && eventEnd > start;
    });

  const fresh = [];
  for (const window of windows) {
    if (fresh.length >= MAX_WINDOWS_PER_CHANGE) break;
    if (overlapsEvent(window.start, window.end)) continue;
    const key = windowNotificationKey(window, DEFAULT_TIME_ZONE);
    if (await claimWindowNotification(db, { groupId: input.groupId, key })) fresh.push(window);
  }
  if (fresh.length === 0) return [];

  const recipients = await listGroupRecipients(db, {
    groupId: input.groupId,
    excludeUserId: input.actorId,
  });
  const groupName = (await getGroupName(db, input.groupId)) ?? '';
  return deliverEmails(
    fresh.flatMap((window) =>
      recipients.map((recipient) =>
        buildWindowEmail(recipient, {
          groupName,
          start: window.start,
          end: window.end,
          locationName: window.locationName,
          players: window.players.map((p) => p.name),
        }),
      ),
    ),
  );
}

/** Cron diário: lembra quem confirmou (ou não respondeu) dos encontros das próximas 24h. */
export async function sendDueReminders(db: Database, now = new Date()) {
  const due = await listEventsNeedingReminder(db, {
    from: now,
    to: new Date(now.getTime() + DAY),
  });
  let sent = 0;
  for (const { id } of due) {
    if (!(await claimEventReminder(db, id))) continue;
    const results = await notifyEvent(db, { eventId: id, kind: 'reminder' });
    sent += results.filter((r) => r.ok).length;
  }
  return { events: due.length, emails: sent };
}
