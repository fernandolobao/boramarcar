import { DomainError } from '../errors';

export const GAME_RESULTS = ['win', 'loss', 'draw'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

export interface GamePlayerResult {
  userId: string;
  result: GameResult;
  deckId?: string | null;
}

export interface GameRecord {
  gameId: string;
  playedAt?: Date;
  players: readonly GamePlayerResult[];
}

export interface PointsTable {
  win: number;
  draw: number;
  loss: number;
}

export interface Standing {
  userId: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  /** Percentual de vitórias entre 0 e 1. */
  winRate: number;
  position: number;
}

export const DEFAULT_POINTS: PointsTable = { win: 3, draw: 1, loss: 0 };

/**
 * Valida o resultado de uma partida multiplayer:
 * - pelo menos 2 jogadores, sem repetição;
 * - no máximo 1 vencedor;
 * - se houver vencedor, ninguém empata;
 * - sem vencedor, pelo menos um jogador precisa ter empatado (ex.: empate geral).
 */
export function validateGameResult(players: readonly GamePlayerResult[]): void {
  if (players.length < 2) {
    throw new DomainError('invalid_input', 'Uma partida precisa de pelo menos 2 jogadores');
  }
  const ids = new Set(players.map((p) => p.userId));
  if (ids.size !== players.length) {
    throw new DomainError('invalid_input', 'Jogador repetido na partida');
  }
  const winners = players.filter((p) => p.result === 'win').length;
  const draws = players.filter((p) => p.result === 'draw').length;
  if (winners > 1) throw new DomainError('invalid_input', 'Só pode haver um vencedor');
  if (winners === 1 && draws > 0) {
    throw new DomainError('invalid_input', 'Partida com vencedor não pode ter empate');
  }
  if (winners === 0 && draws === 0) {
    throw new DomainError('invalid_input', 'Informe o vencedor ou marque empate');
  }
}

/** Calcula a classificação a partir das partidas. Ordem: pontos, vitórias, % vitórias, menos jogos. */
export function computeStandings(
  games: readonly GameRecord[],
  points: PointsTable = DEFAULT_POINTS,
): Standing[] {
  const table = new Map<string, Omit<Standing, 'winRate' | 'position'>>();

  for (const game of games) {
    for (const player of game.players) {
      const row = table.get(player.userId) ?? {
        userId: player.userId,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      };
      row.games += 1;
      if (player.result === 'win') row.wins += 1;
      if (player.result === 'loss') row.losses += 1;
      if (player.result === 'draw') row.draws += 1;
      row.points += points[player.result];
      table.set(player.userId, row);
    }
  }

  const sorted = [...table.values()]
    .map((row) => ({ ...row, winRate: row.games ? row.wins / row.games : 0 }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.winRate - a.winRate ||
        a.games - b.games ||
        a.userId.localeCompare(b.userId),
    );

  // Jogadores empatados em todos os critérios compartilham a mesma posição.
  const standings: Standing[] = [];
  sorted.forEach((row, index) => {
    const prev = standings[index - 1];
    const tied =
      prev !== undefined &&
      prev.points === row.points &&
      prev.wins === row.wins &&
      prev.winRate === row.winRate &&
      prev.games === row.games;
    standings.push({ ...row, position: tied ? prev.position : index + 1 });
  });
  return standings;
}
