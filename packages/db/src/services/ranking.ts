import {
  computeStandings,
  pointsTableOf,
  type GameRecord,
  type PointsTable,
} from '@boramarcar/core';
import { and, eq, gte, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { gamePlayers, games, user } from '../schema';
import { requireMembership } from './groups';

export async function getGroupRanking(
  db: Database,
  input: {
    groupId: string;
    userId: string;
    from?: Date;
    to?: Date;
    /** Só partidas deste tipo de jogo. */
    format?: string;
    /** Sem tabela explícita, vale a do grupo (2.7). */
    points?: PointsTable;
  },
) {
  const group = await requireMembership(db, input.groupId, input.userId);
  const points = input.points ?? pointsTableOf(group);
  const rows = await db
    .select({
      gameId: games.id,
      playedAt: games.playedAt,
      userId: gamePlayers.userId,
      name: user.name,
      image: user.image,
      result: gamePlayers.result,
      deckId: gamePlayers.deckId,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .innerJoin(user, eq(user.id, gamePlayers.userId))
    .where(
      and(
        eq(games.groupId, input.groupId),
        input.from ? gte(games.playedAt, input.from) : undefined,
        input.to ? lt(games.playedAt, input.to) : undefined,
        input.format ? eq(games.format, input.format) : undefined,
      ),
    );

  const byGame = new Map<string, GameRecord>();
  const people = new Map<string, { name: string; image: string | null }>();
  for (const row of rows) {
    people.set(row.userId, { name: row.name, image: row.image });
    const game = byGame.get(row.gameId) ?? {
      gameId: row.gameId,
      playedAt: row.playedAt,
      players: [],
    };
    (game.players as GameRecord['players'][number][]).push({
      userId: row.userId,
      result: row.result,
      deckId: row.deckId,
    });
    byGame.set(row.gameId, game);
  }

  return {
    totalGames: byGame.size,
    points,
    standings: computeStandings([...byGame.values()], points).map((s) => ({
      ...s,
      name: people.get(s.userId)?.name ?? s.userId,
      image: people.get(s.userId)?.image ?? null,
    })),
  };
}
