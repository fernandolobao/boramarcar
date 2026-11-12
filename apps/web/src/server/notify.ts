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
  listPushTargets,
  suggestGameWindows,
  type Database,
} from '@boramarcar/db';
import { buildEventEmail, buildWindowEmail, deliverEmails, type EventEmailKind } from './email';
import { eventIcs } from './event-ics';
import { buildEventPush, buildWindowPush, deliverPush } from './push';

/** Push e e-mail saem juntos; uma falha no push nunca impede o e-mail (nem o contrário). */
async function safely<T>(label: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (error) {
    console.error(`[${label}]`, error);
    return null;
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Push do encontro para os aparelhos de quem deve saber (mesma regra do e-mail, sem o opt-out dele). */
async function pushEvent(
  db: Database,
  input: { eventId: string; kind: EventEmailKind; actorId?: string },
) {
  const data = await getEventForNotification(db, {
    eventId: input.eventId,
    audience: input.kind === 'created' ? 'group' : 'participants',
    excludeUserId: input.actorId,
    channel: 'push',
  });
  if (!data || data.recipients.length === 0) return null;
  const targets = await listPushTargets(
    db,
    data.recipients.map((r) => r.userId),
  );
  return deliverPush(
    db,
    targets.map((target) =>
      buildEventPush(target, {
        kind: input.kind,
        groupName: data.groupName,
        event: data.event,
        locationName: data.location?.name ?? null,
      }),
    ),
  );
}

/** Avisa sobre um encontro: novo (grupo todo), alterado/cancelado (quem não recusou) ou lembrete. */
export async function notifyEvent(
  db: Database,
  input: { eventId: string; kind: EventEmailKind; actorId?: string },
) {
  const [emails] = await Promise.all([
    safely('email', () => emailEvent(db, input)),
    safely('push', () => pushEvent(db, input)),
  ]);
  return emails ?? [];
}

async function emailEvent(
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

  const fresh: typeof windows = [];
  for (const window of windows) {
    if (fresh.length >= MAX_WINDOWS_PER_CHANGE) break;
    if (overlapsEvent(window.start, window.end)) continue;
    const key = windowNotificationKey(window, DEFAULT_TIME_ZONE);
    if (await claimWindowNotification(db, { groupId: input.groupId, key })) fresh.push(window);
  }
  if (fresh.length === 0) return [];

  const groupName = (await getGroupName(db, input.groupId)) ?? '';
  await safely('push', async () => {
    const members = await listGroupRecipients(db, {
      groupId: input.groupId,
      excludeUserId: input.actorId,
      channel: 'push',
    });
    const targets = await listPushTargets(
      db,
      members.map((m) => m.userId),
    );
    return deliverPush(
      db,
      fresh.flatMap((window) =>
        targets.map((target) =>
          buildWindowPush(target, {
            groupName,
            start: window.start,
            players: window.players.length,
          }),
        ),
      ),
    );
  });
  const recipients = await listGroupRecipients(db, {
    groupId: input.groupId,
    excludeUserId: input.actorId,
  });
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
