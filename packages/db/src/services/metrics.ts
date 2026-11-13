import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  ne,
  sql,
} from 'drizzle-orm';
import type { Database } from '../client';
import {
  availabilityRules,
  availabilitySlots,
  decks,
  eventParticipants,
  events,
  feedback,
  gamePlayers,
  games,
  groupMembers,
  groups,
  user,
  account,
  session,
} from '../schema';

/**
 * Métricas do produto (roadmap 8.3 / 7.6), só com contagens agregadas — nada que identifique
 * pessoas. A métrica norte é o número de grupos com pelo menos uma partida registrada (que
 * sempre pertence a um encontro) na janela de 28 dias.
 */
export const METRICS_WINDOW_DAYS = 28;
const DAY = 86_400_000;

const n = async (query: Promise<{ n: number }[]>) => Number((await query)[0]?.n ?? 0);

/** Grupos com partida jogada no intervalo. */
async function groupsWithGames(db: Database, from: Date, to: Date) {
  const rows = await db
    .selectDistinct({ groupId: games.groupId })
    .from(games)
    .where(and(gte(games.playedAt, from), lt(games.playedAt, to)));
  return new Set(rows.map((r) => r.groupId));
}

export async function getProductMetrics(db: Database, now = new Date()) {
  const from = new Date(now.getTime() - METRICS_WINDOW_DAYS * DAY);
  const previousFrom = new Date(from.getTime() - METRICS_WINDOW_DAYS * DAY);
  const inWindow = <T>(column: T) => [gte(column as never, from), lt(column as never, now)];

  const [active, previouslyActive] = await Promise.all([
    groupsWithGames(db, from, now),
    groupsWithGames(db, previousFrom, from),
  ]);
  const retained = [...previouslyActive].filter((id) => active.has(id)).length;

  // Grupos novos na janela: quantos já têm 3+ pessoas e quantos já marcaram um encontro.
  const newGroups = await db
    .select({
      id: groups.id,
      members: countDistinct(groupMembers.userId),
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(and(...inWindow(groups.createdAt)))
    .groupBy(groups.id);
  const newGroupIds = newGroups.map((g) => g.id);
  const withEvent = newGroupIds.length
    ? new Set(
        (
          await db
            .selectDistinct({ groupId: events.groupId })
            .from(events)
            .where(sql`${events.groupId} in ${newGroupIds}`)
        ).map((r) => r.groupId),
      )
    : new Set<string>();

  // Encontros que já aconteceram na janela (não cancelados), quantos fecharam a mesa e quantos
  // viraram partida registrada.
  const held = await db
    .select({
      id: events.id,
      tableSize: groups.tableSize,
      yes: sql<number>`count(${eventParticipants.userId}) filter (where ${eventParticipants.rsvp} = 'yes')`,
      games: sql<number>`(select count(*) from ${games} where ${games.eventId} = ${events.id})`,
    })
    .from(events)
    .innerJoin(groups, eq(groups.id, events.groupId))
    .leftJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
    .where(and(...inWindow(events.startsAt), ne(events.status, 'cancelled')))
    .groupBy(events.id, groups.tableSize);

  const [players, withDeck] = await Promise.all([
    n(
      db
        .select({ n: count() })
        .from(gamePlayers)
        .innerJoin(games, eq(games.id, gamePlayers.gameId))
        .where(and(...inWindow(games.playedAt))),
    ),
    n(
      db
        .select({ n: count() })
        .from(gamePlayers)
        .innerJoin(games, eq(games.id, gamePlayers.gameId))
        .where(and(...inWindow(games.playedAt), isNotNull(gamePlayers.deckId))),
    ),
  ]);

  const [users, newUsers, joins, newDecks, withAvailability, feedbackCount, totalGroups] =
    await Promise.all([
      n(db.select({ n: count() }).from(user).where(isNull(user.deletedAt))),
      n(
        db
          .select({ n: count() })
          .from(user)
          .where(and(...inWindow(user.createdAt), isNull(user.deletedAt))),
      ),
      n(
        db
          .select({ n: count() })
          .from(groupMembers)
          .where(and(...inWindow(groupMembers.joinedAt), ne(groupMembers.role, 'owner'))),
      ),
      n(
        db
          .select({ n: count() })
          .from(decks)
          .where(and(...inWindow(decks.createdAt))),
      ),
      Promise.all([
        db.selectDistinct({ userId: availabilityRules.userId }).from(availabilityRules),
        db.selectDistinct({ userId: availabilitySlots.userId }).from(availabilitySlots),
      ]).then(([a, b]) => new Set([...a, ...b].map((r) => r.userId)).size),
      n(
        db
          .select({ n: count() })
          .from(feedback)
          .where(and(...inWindow(feedback.createdAt))),
      ),
      n(db.select({ n: count() }).from(groups)),
    ]);

  return {
    windowDays: METRICS_WINDOW_DAYS,
    from,
    to: now,
    /** Métrica norte: grupos com partida registrada nos últimos 28 dias. */
    activeGroups: active.size,
    totalGroups,
    /** Dos grupos ativos nos 28 dias anteriores, quantos continuam ativos. */
    retention: { previous: previouslyActive.size, retained },
    newGroups: {
      count: newGroups.length,
      withThreeMembers: newGroups.filter((g) => Number(g.members) >= 3).length,
      withEvent: newGroups.filter((g) => withEvent.has(g.id)).length,
    },
    invites: { joins },
    events: {
      held: held.length,
      tableFilled: held.filter((e) => Number(e.yes) >= e.tableSize).length,
      withGame: held.filter((e) => Number(e.games) > 0).length,
    },
    games: { playerSlots: players, withDeck },
    users: { total: users, new: newUsers, withAvailability },
    decks: { new: newDecks },
    feedback: feedbackCount,
  };
}

export type ProductMetrics = Awaited<ReturnType<typeof getProductMetrics>>;

/**
 * Contas da aplicação para quem administra (`/admin`): nome, e-mail, como entra (Google,
 * e-mail e senha), se confirmou o e-mail, quando criou, último acesso e em quantos grupos está.
 * Contas excluídas (LGPD) ficam de fora.
 */
export async function listUsersForAdmin(db: Database, limit = 1000) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(isNull(user.deletedAt))
    .orderBy(desc(user.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [providers, memberships, sessions] = await Promise.all([
    db
      .select({ userId: account.userId, providerId: account.providerId })
      .from(account)
      .where(inArray(account.userId, ids)),
    db
      .select({ userId: groupMembers.userId, n: count() })
      .from(groupMembers)
      .where(inArray(groupMembers.userId, ids))
      .groupBy(groupMembers.userId),
    db
      .select({ userId: session.userId, last: max(session.updatedAt) })
      .from(session)
      .where(inArray(session.userId, ids))
      .groupBy(session.userId),
  ]);
  const groupsOf = new Map(memberships.map((m) => [m.userId, Number(m.n)]));
  const lastOf = new Map(sessions.map((s) => [s.userId, s.last]));
  return rows.map((r) => ({
    ...r,
    providers: [
      ...new Set(providers.filter((p) => p.userId === r.id).map((p) => p.providerId)),
    ].sort(),
    groups: groupsOf.get(r.id) ?? 0,
    lastSeenAt: lastOf.get(r.id) ?? null,
  }));
}
export type AdminUser = Awaited<ReturnType<typeof listUsersForAdmin>>[number];
