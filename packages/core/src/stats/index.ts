import type { GameResult } from '../ranking';
import { zonedLocalToUtc } from '../time';

/** Partida com os detalhes usados nas estatísticas (2.8 e 2.9). */
export interface StatsGame {
  gameId: string;
  playedAt: Date;
  format: string;
  firstPlayerId: string | null;
  winningTurn: number | null;
  durationMinutes: number | null;
  players: {
    userId: string;
    result: GameResult;
    deckId: string | null;
    seat: number | null;
    team: number | null;
    eliminatedOrder: number | null;
  }[];
}

export interface PlayerStats {
  userId: string;
  games: number;
  wins: number;
  /** Vitórias seguidas até a partida mais recente. */
  currentStreak: number;
  /** Maior sequência de vitórias. */
  bestStreak: number;
  /** Partidas em que começou e quantas dessas venceu. */
  gamesFirst: number;
  winsFirst: number;
  /** Vezes em que foi o primeiro eliminado. */
  firstOut: number;
  /** Resultados das últimas partidas (a mais recente por último, até `RECENT_RESULTS`). */
  recent: ('win' | 'loss' | 'draw')[];
}

/** Quantas partidas entram na "forma" recente de cada jogador. */
export const RECENT_RESULTS = 10;

export interface HeadToHead {
  /** Jogador da linha. */
  userId: string;
  /** Adversário. */
  opponentId: string;
  /** Partidas em que os dois jogaram (em times opostos, quando há times). */
  games: number;
  /** Vitórias da linha nessas partidas. */
  wins: number;
  /** Vitórias do adversário nessas partidas. */
  losses: number;
}

export interface DeckStats {
  deckId: string;
  userId: string;
  games: number;
  wins: number;
  winRate: number;
  lastPlayedAt: Date;
}

export interface GroupStats {
  totalGames: number;
  players: PlayerStats[];
  headToHead: HeadToHead[];
  decks: DeckStats[];
  /** Média do turno em que as partidas acabaram (só partidas com o dado). */
  averageWinningTurn: number | null;
  averageDurationMinutes: number | null;
  /** % de vitórias de quem começou (partidas com o dado e com vencedor). */
  firstPlayerWinRate: number | null;
  firstPlayerSample: number;
  /** Vitórias por posição na mesa (todos contra todos), para ver se começar ajuda. */
  winsBySeat: { seat: number; games: number; wins: number }[];
}

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Calcula estatísticas do grupo a partir das partidas (qualquer ordem). */
export function computeGroupStats(games: readonly StatsGame[]): GroupStats {
  const ordered = [...games].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime() || a.gameId.localeCompare(b.gameId),
  );
  const players = new Map<string, PlayerStats>();
  const h2h = new Map<string, HeadToHead>();
  const decks = new Map<string, DeckStats>();
  const seats = new Map<number, { seat: number; games: number; wins: number }>();
  let firstSample = 0;
  let firstWins = 0;

  const player = (userId: string) => {
    let row = players.get(userId);
    if (!row) {
      row = {
        userId,
        games: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
        gamesFirst: 0,
        winsFirst: 0,
        firstOut: 0,
        recent: [],
      };
      players.set(userId, row);
    }
    return row;
  };

  for (const game of ordered) {
    const hasWinner = game.players.some((p) => p.result === 'win');
    const minOrder = Math.min(
      ...game.players.map((p) => p.eliminatedOrder ?? Number.POSITIVE_INFINITY),
    );

    for (const p of game.players) {
      const row = player(p.userId);
      row.games += 1;
      if (p.result === 'win') {
        row.wins += 1;
        row.currentStreak += 1;
        row.bestStreak = Math.max(row.bestStreak, row.currentStreak);
      } else {
        row.currentStreak = 0;
      }
      if (game.firstPlayerId === p.userId) {
        row.gamesFirst += 1;
        if (p.result === 'win') row.winsFirst += 1;
      }
      if (p.eliminatedOrder != null && p.eliminatedOrder === minOrder) row.firstOut += 1;
      row.recent = [...row.recent, p.result].slice(-RECENT_RESULTS);

      if (p.deckId) {
        const deck = decks.get(p.deckId) ?? {
          deckId: p.deckId,
          userId: p.userId,
          games: 0,
          wins: 0,
          winRate: 0,
          lastPlayedAt: game.playedAt,
        };
        deck.games += 1;
        if (p.result === 'win') deck.wins += 1;
        deck.lastPlayedAt = game.playedAt;
        decks.set(p.deckId, deck);
      }

      const isFfa = game.players.every((x) => x.team == null);
      if (isFfa && p.seat != null && game.players.length > 2) {
        const seat = seats.get(p.seat) ?? { seat: p.seat, games: 0, wins: 0 };
        seat.games += 1;
        if (p.result === 'win') seat.wins += 1;
        seats.set(p.seat, seat);
      }

      // Confronto direto: só contra adversários (não contra o próprio time).
      for (const o of game.players) {
        if (o.userId === p.userId || (p.team != null && p.team === o.team)) continue;
        const key = `${p.userId}|${o.userId}`;
        const pair = h2h.get(key) ?? {
          userId: p.userId,
          opponentId: o.userId,
          games: 0,
          wins: 0,
          losses: 0,
        };
        pair.games += 1;
        if (p.result === 'win') pair.wins += 1;
        if (o.result === 'win') pair.losses += 1;
        h2h.set(key, pair);
      }
    }

    if (game.firstPlayerId && hasWinner) {
      firstSample += 1;
      const first = game.players.find((p) => p.userId === game.firstPlayerId);
      if (first?.result === 'win') firstWins += 1;
    }
  }

  return {
    totalGames: games.length,
    players: [...players.values()].sort(
      (a, b) => b.bestStreak - a.bestStreak || b.wins - a.wins || a.userId.localeCompare(b.userId),
    ),
    headToHead: [...h2h.values()],
    decks: [...decks.values()]
      .map((d) => ({ ...d, winRate: d.games ? d.wins / d.games : 0 }))
      .sort(
        (a, b) => b.games - a.games || b.winRate - a.winRate || a.deckId.localeCompare(b.deckId),
      ),
    averageWinningTurn: average(
      games.flatMap((g) => (g.winningTurn != null ? [g.winningTurn] : [])),
    ),
    averageDurationMinutes: average(
      games.flatMap((g) => (g.durationMinutes != null ? [g.durationMinutes] : [])),
    ),
    firstPlayerWinRate: firstSample ? firstWins / firstSample : null,
    firstPlayerSample: firstSample,
    winsBySeat: [...seats.values()].sort((a, b) => a.seat - b.seat),
  };
}

/**
 * Partidas por mês nos últimos `months` meses (incluindo o atual, do mais antigo ao mais novo),
 * no fuso do grupo; meses sem partida aparecem com 0.
 */
export function gamesByMonth(
  games: readonly { playedAt: Date }[],
  options: { months?: number; now?: Date; timeZone?: string } = {},
): { month: string; games: number }[] {
  const months = options.months ?? 6;
  const timeZone = options.timeZone ?? 'America/Sao_Paulo';
  const key = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(date);
  const current = key(options.now ?? new Date());
  const [year, month] = current.split('-').map(Number) as [number, number];
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (months - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const game of games) {
    const k = key(game.playedAt);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((k) => ({ month: k, games: counts.get(k)! }));
}

/* ---------- Períodos do ranking (2.6) ---------- */

export interface Season {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
}

export type RankingPeriod = 'all' | 'last30' | 'thisYear' | `season:${string}`;

/**
 * Intervalo [from, to) de um período. `thisYear` usa o ano no fuso informado.
 * Temporada desconhecida volta para "todas as partidas".
 */
export function resolvePeriod(
  period: string | undefined,
  options: { now: Date; timeZone: string; seasons: readonly Season[] },
): { period: RankingPeriod; from?: Date; to?: Date; season?: Season } {
  if (period === 'last30') {
    return { period, from: new Date(options.now.getTime() - 30 * 24 * 3600_000) };
  }
  if (period === 'thisYear') {
    const year = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: options.timeZone, year: 'numeric' }).format(
        options.now,
      ),
    );
    return {
      period,
      from: startOfYearIn(year, options.timeZone),
      to: startOfYearIn(year + 1, options.timeZone),
    };
  }
  if (period?.startsWith('season:')) {
    const season = options.seasons.find((s) => `season:${s.id}` === period);
    if (season) {
      return { period: `season:${season.id}`, from: season.startsAt, to: season.endsAt, season };
    }
  }
  return { period: 'all' };
}

/** 1º de janeiro, 00:00, no fuso informado. */
const startOfYearIn = (year: number, timeZone: string) =>
  zonedLocalToUtc(`${year}-01-01T00:00`, timeZone);
