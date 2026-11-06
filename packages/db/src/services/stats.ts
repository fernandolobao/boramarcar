import { computeGroupStats, DomainError, type StatsGame } from '@boramarcar/core';
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { decks, gamePlayers, games, seasons, user } from '../schema';
import { getDeckCovers } from './decks';
import { requireMembership } from './groups';

/* ---------- Temporadas (2.6) ---------- */

export async function listSeasons(db: Database, input: { groupId: string; userId: string }) {
  await requireMembership(db, input.groupId, input.userId);
  return db
    .select({
      id: seasons.id,
      name: seasons.name,
      startsAt: seasons.startsAt,
      endsAt: seasons.endsAt,
    })
    .from(seasons)
    .where(eq(seasons.groupId, input.groupId))
    .orderBy(asc(seasons.startsAt));
}

async function requireAdmin(db: Database, groupId: string, userId: string) {
  const group = await requireMembership(db, groupId, userId);
  if (group.role === 'member') {
    throw new DomainError('forbidden', 'Só o dono ou um admin pode gerenciar temporadas');
  }
  return group;
}

export async function createSeason(
  db: Database,
  input: { groupId: string; userId: string; name: string; startsAt: Date; endsAt: Date },
) {
  await requireAdmin(db, input.groupId, input.userId);
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) {
    throw new DomainError('invalid_input', 'O nome da temporada precisa de 2 a 60 caracteres');
  }
  if (!(input.endsAt > input.startsAt)) {
    throw new DomainError('invalid_input', 'O fim da temporada deve ser depois do início');
  }
  const [season] = await db
    .insert(seasons)
    .values({
      groupId: input.groupId,
      name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdBy: input.userId,
    })
    .returning();
  return season!;
}

export async function deleteSeason(db: Database, input: { seasonId: string; userId: string }) {
  const [season] = await db.select().from(seasons).where(eq(seasons.id, input.seasonId)).limit(1);
  if (!season) throw new DomainError('not_found', 'Temporada não encontrada');
  await requireAdmin(db, season.groupId, input.userId);
  await db.delete(seasons).where(eq(seasons.id, season.id));
}

/* ---------- Estatísticas (2.8 e 2.9) ---------- */

/**
 * Estatísticas do grupo no período/tipo de jogo: sequências, confronto direto, quem começa,
 * primeiro a sair, médias, decks (com capa) e comandantes mais jogados.
 */
export async function getGroupStats(
  db: Database,
  input: { groupId: string; userId: string; from?: Date; to?: Date; format?: string },
) {
  await requireMembership(db, input.groupId, input.userId);
  const gameRows = await db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      format: games.format,
      firstPlayerId: games.firstPlayerId,
      winningTurn: games.winningTurn,
      durationMinutes: games.durationMinutes,
    })
    .from(games)
    .where(
      and(
        eq(games.groupId, input.groupId),
        input.from ? gte(games.playedAt, input.from) : undefined,
        input.to ? lt(games.playedAt, input.to) : undefined,
        input.format ? eq(games.format, input.format) : undefined,
      ),
    );
  const playerRows = gameRows.length
    ? await db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          name: user.name,
          result: gamePlayers.result,
          deckId: gamePlayers.deckId,
          deckName: decks.name,
          seat: gamePlayers.seat,
          team: gamePlayers.team,
          eliminatedOrder: gamePlayers.eliminatedOrder,
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

  const statsGames: StatsGame[] = gameRows.map((g) => ({
    gameId: g.id,
    playedAt: g.playedAt,
    format: g.format,
    firstPlayerId: g.firstPlayerId,
    winningTurn: g.winningTurn,
    durationMinutes: g.durationMinutes,
    players: playerRows.filter((p) => p.gameId === g.id),
  }));
  const stats = computeGroupStats(statsGames);
  const names = new Map(playerRows.map((p) => [p.userId, p.name]));
  const deckNames = new Map(
    playerRows.flatMap((p) => (p.deckId ? [[p.deckId, p.deckName ?? '']] : [])),
  );
  const covers = await getDeckCovers(
    db,
    stats.decks.map((d) => d.deckId),
  );
  const nameOf = (id: string) => names.get(id) ?? id;

  const deckStats = stats.decks.map((d) => ({
    ...d,
    name: deckNames.get(d.deckId) ?? '',
    ownerName: nameOf(d.userId),
    cover: covers.get(d.deckId) ?? null,
  }));

  // Comandantes do grupo: soma os decks que têm o mesmo comandante (ou dupla de comandantes).
  const commanders = new Map<
    string,
    { name: string; artUri: string | null; games: number; wins: number; players: Set<string> }
  >();
  for (const deck of deckStats) {
    const cards = deck.cover?.cards ?? [];
    if (!cards.length) continue;
    const key = cards.map((c) => c.name).join(' & ');
    const row = commanders.get(key) ?? {
      name: key,
      artUri: deck.cover?.artUri ?? null,
      games: 0,
      wins: 0,
      players: new Set<string>(),
    };
    row.games += deck.games;
    row.wins += deck.wins;
    row.players.add(deck.ownerName);
    commanders.set(key, row);
  }

  return {
    ...stats,
    players: stats.players.map((p) => ({ ...p, name: nameOf(p.userId) })),
    headToHead: stats.headToHead.map((h) => ({
      ...h,
      name: nameOf(h.userId),
      opponentName: nameOf(h.opponentId),
    })),
    decks: deckStats,
    commanders: [...commanders.values()]
      .map((c) => ({
        ...c,
        players: [...c.players].sort(),
        winRate: c.games ? c.wins / c.games : 0,
      }))
      .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.name.localeCompare(b.name)),
    /** Tipos de jogo já jogados no grupo (para o filtro), independentemente do filtro atual. */
    formats: (
      await db
        .selectDistinct({ format: games.format })
        .from(games)
        .where(eq(games.groupId, input.groupId))
    )
      .map((r) => r.format)
      .sort(),
  };
}
