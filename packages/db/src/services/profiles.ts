import {
  computeAchievements,
  DomainError,
  type AchievementContext,
  type AchievementGame,
  type SeasonTitle,
} from '@boramarcar/core';
import { and, eq, inArray, lte } from 'drizzle-orm';
import type { Database } from '../client';
import {
  deckCards,
  events,
  gamePlayers,
  games,
  groupMembers,
  groups,
  seasons,
  user,
} from '../schema';
import { listDecksVisibleTo, sharesGroup } from './decks';
import { getGroupRanking } from './ranking';
import { getUserSummary } from './users';

/** Partidas em que o jogador jogou, com todos os jogadores (para conquistas). */
async function listPlayerGames(
  db: Database,
  userId: string,
): Promise<(AchievementGame & { id: string })[]> {
  const mine = await db
    .select({ gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, userId));
  if (!mine.length) return [];
  const ids = mine.map((m) => m.gameId);
  const [gameRows, playerRows] = await Promise.all([
    db
      .select({
        id: games.id,
        playedAt: games.playedAt,
        format: games.format,
        firstPlayerId: games.firstPlayerId,
        winningTurn: games.winningTurn,
        groupId: games.groupId,
        eventId: games.eventId,
      })
      .from(games)
      .where(inArray(games.id, ids)),
    db
      .select({
        gameId: gamePlayers.gameId,
        userId: gamePlayers.userId,
        result: gamePlayers.result,
        deckId: gamePlayers.deckId,
      })
      .from(gamePlayers)
      .where(inArray(gamePlayers.gameId, ids)),
  ]);
  // Decks (do jogador) com proxies hoje, para "Proxy de respeito".
  const myDecks = [
    ...new Set(playerRows.filter((p) => p.userId === userId && p.deckId).map((p) => p.deckId!)),
  ];
  const withProxies = new Set(
    myDecks.length
      ? (
          await db
            .selectDistinct({ deckId: deckCards.deckId })
            .from(deckCards)
            .where(and(inArray(deckCards.deckId, myDecks), eq(deckCards.isProxy, true)))
        ).map((r) => r.deckId)
      : [],
  );
  return gameRows.map((g) => ({
    ...g,
    players: playerRows
      .filter((p) => p.gameId === g.id)
      .map((p) => ({ ...p, deckHasProxies: p.deckId ? withProxies.has(p.deckId) : false })),
  }));
}

/**
 * O que as conquistas precisam além das partidas: membros atuais dos grupos do jogador, os
 * encontros desses grupos que tiveram partida (para "4 encontros seguidos") e o fuso dele.
 */
async function achievementContext(db: Database, userId: string): Promise<AchievementContext> {
  const [mine, [person]] = await Promise.all([
    db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId)),
    db.select({ timeZone: user.timeZone }).from(user).where(eq(user.id, userId)).limit(1),
  ]);
  const groupIds = mine.map((m) => m.groupId);
  if (!groupIds.length) return { timeZone: person?.timeZone ?? undefined };
  const [members, held] = await Promise.all([
    db
      .select({
        groupId: groupMembers.groupId,
        userId: groupMembers.userId,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds)),
    db
      .selectDistinct({ groupId: events.groupId, eventId: events.id, startsAt: events.startsAt })
      .from(events)
      .innerJoin(games, eq(games.eventId, events.id))
      .where(inArray(events.groupId, groupIds)),
  ]);
  const groupMembersMap: Record<string, string[]> = {};
  for (const m of members) (groupMembersMap[m.groupId] ??= []).push(m.userId);
  const memberSince: Record<string, Record<string, Date>> = {};
  for (const m of members) (memberSince[m.groupId] ??= {})[m.userId] = m.joinedAt;
  return {
    groupMembers: groupMembersMap,
    memberSince,
    groupEvents: held,
    timeZone: person?.timeZone ?? undefined,
  };
}

/** Conquistas do jogador (com a data de cada uma), calculadas das partidas. */
export async function getUserAchievements(db: Database, userId: string, now = new Date()) {
  const [playerGames, titles, context] = await Promise.all([
    listPlayerGames(db, userId),
    listSeasonTitles(db, userId, now),
    achievementContext(db, userId),
  ]);
  return computeAchievements(userId, playerGames, titles, context);
}

/**
 * Conquistas que uma partida desbloqueou para o jogador: as que ele tem com ela e não teria sem
 * ela (partidas antigas registradas depois também contam).
 */
export async function achievementsUnlockedByGame(
  db: Database,
  input: { userId: string; gameId: string; now?: Date },
) {
  const [playerGames, titles, context] = await Promise.all([
    listPlayerGames(db, input.userId),
    listSeasonTitles(db, input.userId, input.now ?? new Date()),
    achievementContext(db, input.userId),
  ]);
  const before = new Set(
    computeAchievements(
      input.userId,
      playerGames.filter((g) => g.id !== input.gameId),
      titles,
      context,
    )
      .filter((a) => a.unlocked)
      .map((a) => a.id),
  );
  return computeAchievements(input.userId, playerGames, titles, context)
    .filter((a) => a.unlocked && !before.has(a.id))
    .map((a) => a.id);
}

/** Temporadas encerradas em que o jogador terminou em 1º (empates no 1º lugar também contam). */
async function listSeasonTitles(db: Database, userId: string, now: Date): Promise<SeasonTitle[]> {
  const ended = await db
    .select({
      groupId: seasons.groupId,
      groupName: groups.name,
      name: seasons.name,
      startsAt: seasons.startsAt,
      endsAt: seasons.endsAt,
    })
    .from(seasons)
    .innerJoin(groups, eq(groups.id, seasons.groupId))
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.groupId, seasons.groupId), eq(groupMembers.userId, userId)),
    )
    .where(lte(seasons.endsAt, now));
  const titles: SeasonTitle[] = [];
  for (const season of ended) {
    const ranking = await getGroupRanking(db, {
      groupId: season.groupId,
      userId,
      from: season.startsAt,
      to: season.endsAt,
    });
    if (ranking.standings.some((s) => s.userId === userId && s.position === 1)) {
      titles.push({ seasonName: season.name, groupName: season.groupName, endsAt: season.endsAt });
    }
  }
  return titles;
}

/**
 * Perfil de um jogador (o próprio ou alguém de um grupo em comum): resumo, conquistas e os decks
 * que quem está vendo pode ver. O e-mail e os grupos que não são em comum só aparecem para o dono.
 */
export async function getPlayerProfile(
  db: Database,
  input: {
    userId: string;
    viewerId: string;
    now?: Date;
    /**
     * Admin da plataforma (`ADMIN_EMAILS`): vê o perfil de qualquer pessoa, com todos os grupos
     * dela. Os decks seguem a visibilidade de sempre (privados e de grupo continuam fechados).
     */
    viewerIsAdmin?: boolean;
  },
) {
  const [person] = await db
    .select({ id: user.id, name: user.name, image: user.image, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!person) throw new DomainError('not_found', 'Jogador não encontrado');
  const isSelf = input.userId === input.viewerId;
  const admin = Boolean(input.viewerIsAdmin);
  if (!isSelf && !admin && !(await sharesGroup(db, input.userId, input.viewerId))) {
    // Mesmo erro de "não existe": não revela quem usa o app.
    throw new DomainError('not_found', 'Jogador não encontrado');
  }
  const [summary, playerGames, titles, decksVisible, viewerGroups, context] = await Promise.all([
    getUserSummary(db, input.userId),
    listPlayerGames(db, input.userId),
    listSeasonTitles(db, input.userId, input.now ?? new Date()),
    listDecksVisibleTo(db, { ownerId: input.userId, viewerId: input.viewerId }),
    isSelf || admin
      ? Promise.resolve(null)
      : db
          .select({ groupId: groupMembers.groupId })
          .from(groupMembers)
          .where(eq(groupMembers.userId, input.viewerId)),
    achievementContext(db, input.userId),
  ]);
  const shared = viewerGroups ? new Set(viewerGroups.map((g) => g.groupId)) : null;
  return {
    id: person.id,
    name: person.name,
    image: person.image,
    email: isSelf ? person.email : null,
    isSelf,
    memberSince: summary.memberSince,
    games: summary.games,
    wins: summary.wins,
    winRate: summary.winRate,
    groups: shared ? summary.groups.filter((g) => shared.has(g.id)) : summary.groups,
    decks: decksVisible,
    achievements: computeAchievements(input.userId, playerGames, titles, context),
    seasonTitles: titles,
  };
}
