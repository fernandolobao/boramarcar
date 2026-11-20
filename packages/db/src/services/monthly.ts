import { monthBounds, monthlyRecap, previousMonth } from '@boramarcar/core/integration';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { events, games, groupMembers, groups, notifications, user } from '../schema';
import { addNotifications } from './inbox';
import { displayNames } from './recap';
import { loadGroupGames } from './records';

/** Fuso da retrospectiva: o de quem criou o grupo (ou o de São Paulo). */
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

async function groupTimeZone(db: Database, groupId: string) {
  const [row] = await db
    .select({ timeZone: user.timeZone })
    .from(groups)
    .innerJoin(user, eq(user.id, groups.createdBy))
    .where(eq(groups.id, groupId))
    .limit(1);
  return row ? (row.timeZone ?? DEFAULT_TIME_ZONE) : null;
}

/** Mês da retrospectiva mais recente (o anterior ao atual, no fuso do grupo). */
export async function lastRecapMonth(db: Database, input: { groupId: string; now?: Date }) {
  const timeZone = (await groupTimeZone(db, input.groupId)) ?? DEFAULT_TIME_ZONE;
  return previousMonth(input.now ?? new Date(), timeZone);
}

/**
 * Retrospectiva do mês ("AAAA-MM") de um grupo, pública para quem tem o link (como o resumo da
 * noite): só primeiros nomes, títulos dos encontros e números — nada de nome do grupo, local,
 * foto ou e-mail. `null` se o grupo não existe, o mês é inválido ou ainda não começou.
 */
export async function getMonthlyRecap(
  db: Database,
  input: { groupId: string; month: string; now?: Date },
) {
  const timeZone = await groupTimeZone(db, input.groupId);
  if (!timeZone) return null;
  const bounds = monthBounds(input.month, timeZone);
  if (!bounds || bounds.from > (input.now ?? new Date())) return null;
  const { list, decks } = await loadGroupGames(db, input.groupId, null);
  const recap = monthlyRecap(list, bounds, decks);

  const ids = [
    ...new Set([
      ...recap.players,
      ...recap.debuts,
      ...(recap.records.fastestWin?.winnerIds ?? []),
      ...(recap.records.longestStreak ? [recap.records.longestStreak.userId] : []),
    ]),
  ];
  const eventIds = [
    ...new Set(
      [recap.records.fastestWin, recap.records.longestGame, recap.records.busiestNight]
        .filter((r) => r !== null)
        .map((r) => r.eventId),
    ),
  ];
  const [people, titles] = await Promise.all([
    ids.length
      ? db.select({ userId: user.id, name: user.name }).from(user).where(inArray(user.id, ids))
      : [],
    eventIds.length
      ? db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))
      : [],
  ]);
  return {
    month: input.month,
    timeZone,
    from: bounds.from,
    recap,
    names: Object.fromEntries(displayNames(people)) as Record<string, string>,
    eventTitles: Object.fromEntries(titles.map((e) => [e.id, e.title])) as Record<string, string>,
  };
}
export type MonthlyRecapView = NonNullable<Awaited<ReturnType<typeof getMonthlyRecap>>>;

/**
 * Dia 1: avisa (no sino) cada grupo que jogou no mês anterior que a retrospectiva está pronta.
 * Uma vez por grupo e mês (rodar de novo não repete).
 */
export async function notifyMonthlyRecaps(db: Database, now = new Date()) {
  const allGroups = await db.select({ id: groups.id }).from(groups);
  let notified = 0;
  for (const { id: groupId } of allGroups) {
    const timeZone = (await groupTimeZone(db, groupId)) ?? DEFAULT_TIME_ZONE;
    const month = previousMonth(now, timeZone);
    const bounds = monthBounds(month, timeZone)!;
    const [played] = await db
      .select({ id: games.id })
      .from(games)
      .where(
        and(
          eq(games.groupId, groupId),
          gte(games.playedAt, bounds.from),
          lt(games.playedAt, bounds.to),
        ),
      )
      .limit(1);
    if (!played) continue;
    const sent = await db
      .select({ data: notifications.data })
      .from(notifications)
      .where(and(eq(notifications.groupId, groupId), eq(notifications.kind, 'monthly')));
    if (sent.some((n) => (n.data as { month?: string }).month === month)) continue;
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    await addNotifications(
      db,
      members.map((m) => ({
        userId: m.userId,
        groupId,
        data: { kind: 'monthly' as const, groupId, month },
      })),
    );
    notified += 1;
  }
  return notified;
}
