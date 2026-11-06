import {
  computeAchievements,
  DomainError,
  type AchievementGame,
  type SeasonTitle,
} from '@boramarcar/core';
import { and, eq, inArray, lte } from 'drizzle-orm';
import type { Database } from '../client';
import { gamePlayers, games, groupMembers, groups, seasons, user } from '../schema';
import { listDecksVisibleTo, sharesGroup } from './decks';
import { getGroupRanking } from './ranking';
import { getUserSummary } from './users';

/** Partidas em que o jogador jogou, com todos os jogadores (para conquistas). */
async function listPlayerGames(db: Database, userId: string): Promise<AchievementGame[]> {
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
  return gameRows.map((g) => ({ ...g, players: playerRows.filter((p) => p.gameId === g.id) }));
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
  input: { userId: string; viewerId: string; now?: Date },
) {
  const [person] = await db
    .select({ id: user.id, name: user.name, image: user.image, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!person) throw new DomainError('not_found', 'Jogador não encontrado');
  const isSelf = input.userId === input.viewerId;
  if (!isSelf && !(await sharesGroup(db, input.userId, input.viewerId))) {
    // Mesmo erro de "não existe": não revela quem usa o app.
    throw new DomainError('not_found', 'Jogador não encontrado');
  }
  const [summary, playerGames, titles, decksVisible, viewerGroups] = await Promise.all([
    getUserSummary(db, input.userId),
    listPlayerGames(db, input.userId),
    listSeasonTitles(db, input.userId, input.now ?? new Date()),
    listDecksVisibleTo(db, { ownerId: input.userId, viewerId: input.viewerId }),
    isSelf
      ? Promise.resolve(null)
      : db
          .select({ groupId: groupMembers.groupId })
          .from(groupMembers)
          .where(eq(groupMembers.userId, input.viewerId)),
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
    achievements: computeAchievements(input.userId, playerGames, titles),
    seasonTitles: titles,
  };
}
