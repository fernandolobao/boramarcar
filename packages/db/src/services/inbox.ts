import type { NotificationData, NotificationKind } from '@boramarcar/core';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../client';
import {
  announcements,
  events,
  gamePlayers,
  games,
  groupMembers,
  groupPodiums,
  groups,
  notifications,
  user,
} from '../schema';
import { achievementsUnlockedByGame } from './profiles';
import { getGroupRanking } from './ranking';

/**
 * Central de notificações (sino no site e no app). Cada linha guarda só identificadores; nomes de
 * pessoas, título do encontro e nome do grupo são lidos na hora de listar (o texto é montado no
 * idioma de quem lê).
 */

type NewNotification = { userId: string; groupId: string | null; data: NotificationData };

/** Grava várias notificações de uma vez. */
export async function addNotifications(db: Database, list: readonly NewNotification[]) {
  if (!list.length) return;
  await db.insert(notifications).values(
    list.map((n) => ({
      userId: n.userId,
      groupId: n.groupId,
      kind: n.data.kind,
      data: n.data,
    })),
  );
}

/**
 * Partida registrada: quem jogou recebe "partida registrada" (com o resultado dela); quem é do
 * grupo e não jogou, "partida no grupo". Quem registrou não recebe nada.
 */
export async function notifyGameRecorded(db: Database, input: { gameId: string; actorId: string }) {
  const [game] = await db
    .select({ id: games.id, groupId: games.groupId, eventId: games.eventId })
    .from(games)
    .where(eq(games.id, input.gameId))
    .limit(1);
  if (!game) return;
  const [players, members] = await Promise.all([
    db
      .select({ userId: gamePlayers.userId, result: gamePlayers.result })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id)),
    db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, game.groupId)),
  ]);
  const winnerIds = players.filter((p) => p.result === 'win').map((p) => p.userId);
  const inGame = new Set(players.map((p) => p.userId));
  await addNotifications(db, [
    ...players
      .filter((p) => p.userId !== input.actorId)
      .map((p) => ({
        userId: p.userId,
        groupId: game.groupId,
        data: {
          kind: 'game' as const,
          gameId: game.id,
          eventId: game.eventId,
          result: p.result,
          winnerIds,
        },
      })),
    ...members
      .filter((m) => m.userId !== input.actorId && !inGame.has(m.userId))
      .map((m) => ({
        userId: m.userId,
        groupId: game.groupId,
        data: { kind: 'group_game' as const, gameId: game.id, eventId: game.eventId, winnerIds },
      })),
  ]);
}

/**
 * Conquistas que a partida desbloqueou para cada jogador viram notificação (uma vez por
 * conquista: rodar de novo, ou editar a partida, não repete).
 */
export async function notifyAchievementsFromGame(db: Database, input: { gameId: string }) {
  const [game] = await db
    .select({ groupId: games.groupId })
    .from(games)
    .where(eq(games.id, input.gameId))
    .limit(1);
  if (!game) return;
  const players = await db
    .select({ userId: gamePlayers.userId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, input.gameId));
  for (const { userId } of players) {
    const unlocked = await achievementsUnlockedByGame(db, { userId, gameId: input.gameId });
    if (!unlocked.length) continue;
    const already = await db
      .select({ data: notifications.data })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.kind, 'achievement')));
    const notified = new Set(
      already.map((n) => (n.data as { achievementId?: string }).achievementId),
    );
    await addNotifications(
      db,
      unlocked
        .filter((id) => !notified.has(id))
        .map((achievementId) => ({
          userId,
          groupId: game.groupId,
          data: { kind: 'achievement' as const, achievementId },
        })),
    );
  }
}

/**
 * Confere o pódio (top 3 do ranking geral) do grupo depois de registrar, editar ou apagar uma
 * partida. Se mudou desde o último aviso, todo o grupo recebe uma notificação. A primeira
 * leitura só guarda (sem avisar sobre um pódio que já existia).
 */
export async function checkPodium(db: Database, input: { groupId: string; actorId: string }) {
  const ranking = await getGroupRanking(db, { groupId: input.groupId, userId: input.actorId });
  const top = ranking.standings
    .filter((s) => s.games > 0)
    .slice(0, 3)
    .map((s) => s.userId);
  const [stored] = await db
    .select({ userIds: groupPodiums.userIds })
    .from(groupPodiums)
    .where(eq(groupPodiums.groupId, input.groupId))
    .limit(1);
  const previous = (stored?.userIds as string[] | undefined) ?? null;
  if (previous && previous.join() === top.join()) return;
  await db
    .insert(groupPodiums)
    .values({ groupId: input.groupId, userIds: top })
    .onConflictDoUpdate({
      target: groupPodiums.groupId,
      set: { userIds: top, updatedAt: new Date() },
    });
  if (!previous || top.length === 0) return;
  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, input.groupId));
  await addNotifications(
    db,
    members.map((m) => ({
      userId: m.userId,
      groupId: input.groupId,
      data: { kind: 'podium' as const, userIds: top },
    })),
  );
}

/** Pessoas citadas numa notificação (para mostrar o nome). */
const peopleIn = (data: NotificationData): string[] =>
  data.kind === 'game' || data.kind === 'group_game'
    ? data.winnerIds
    : data.kind === 'podium'
      ? data.userIds
      : [];

export interface InboxItem {
  id: string;
  kind: NotificationKind;
  data: NotificationData;
  createdAt: Date;
  readAt: Date | null;
  groupName: string | null;
  eventTitle: string | null;
  /** Nome de cada pessoa citada, por id. */
  people: Record<string, string>;
  /** Título e texto, nos avisos do ArcanaKin. */
  announcement: { title: string; body: string } | null;
}

/** Notificações da pessoa, mais novas primeiro. */
export async function listNotifications(
  db: Database,
  input: { userId: string; limit?: number },
): Promise<InboxItem[]> {
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      data: notifications.data,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      groupName: groups.name,
    })
    .from(notifications)
    .leftJoin(groups, eq(groups.id, notifications.groupId))
    .where(eq(notifications.userId, input.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(input.limit ?? 50);
  const items = rows.map((r) => ({ ...r, data: r.data as NotificationData }));
  const userIds = [...new Set(items.flatMap((i) => peopleIn(i.data)))];
  const eventIds = [
    ...new Set(
      items.flatMap((i) =>
        i.data.kind === 'game' || i.data.kind === 'group_game' ? [i.data.eventId] : [],
      ),
    ),
  ];
  const announcementIds = [
    ...new Set(
      items.flatMap((i) => (i.data.kind === 'announcement' ? [i.data.announcementId] : [])),
    ),
  ];
  const [names, titles, notices] = await Promise.all([
    userIds.length
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
      : [],
    eventIds.length
      ? db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))
      : [],
    announcementIds.length
      ? db
          .select({ id: announcements.id, title: announcements.title, body: announcements.body })
          .from(announcements)
          .where(inArray(announcements.id, announcementIds))
      : [],
  ]);
  const noticeOf = new Map(notices.map((n) => [n.id, { title: n.title, body: n.body }]));
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const titleOf = new Map(titles.map((e) => [e.id, e.title]));
  return items.map((i) => ({
    id: i.id,
    kind: i.kind as NotificationKind,
    data: i.data,
    createdAt: i.createdAt,
    readAt: i.readAt,
    groupName: i.groupName,
    eventTitle:
      i.data.kind === 'game' || i.data.kind === 'group_game'
        ? (titleOf.get(i.data.eventId) ?? null)
        : null,
    announcement:
      i.data.kind === 'announcement' ? (noticeOf.get(i.data.announcementId) ?? null) : null,
    people: Object.fromEntries(
      peopleIn(i.data).flatMap((id) => (nameOf.has(id) ? [[id, nameOf.get(id)!]] : [])),
    ),
  }));
}

/** Quantas notificações a pessoa ainda não leu (o número do sino). */
export async function countUnreadNotifications(db: Database, input: { userId: string }) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, input.userId), isNull(notifications.readAt)));
  return Number(row?.n ?? 0);
}

/**
 * Marca uma notificação como lida (só a da própria pessoa). Devolve `false` se ela não existe ou
 * é de outra pessoa (a rota responde 404, sem revelar qual).
 */
export async function markNotificationRead(
  db: Database,
  input: { userId: string; id: string; now?: Date },
) {
  const [own] = await db
    .select({ readAt: notifications.readAt })
    .from(notifications)
    .where(and(eq(notifications.id, input.id), eq(notifications.userId, input.userId)))
    .limit(1);
  if (!own) return false;
  if (!own.readAt) {
    await db
      .update(notifications)
      .set({ readAt: input.now ?? new Date() })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, input.userId)));
  }
  return true;
}

/** "Marcar todas como lidas": tudo o que chegou até agora conta como lido. */
export async function markNotificationsRead(db: Database, input: { userId: string; now?: Date }) {
  await db
    .update(notifications)
    .set({ readAt: input.now ?? new Date() })
    .where(and(eq(notifications.userId, input.userId), isNull(notifications.readAt)));
}
