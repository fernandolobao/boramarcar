import type { HeadToHead } from '../stats';

/** Partidas juntos para alguém virar "maior rival" ou "freguês" (não rotular por uma partida). */
export const RIVALRY_MIN_GAMES = 3;

export interface Rivalry {
  opponentId: string;
  /** Partidas em que os dois jogaram. */
  games: number;
  /** Vitórias de quem vê. */
  wins: number;
  /** Vitórias do adversário. */
  losses: number;
}

const pick = ({ opponentId, games, wins, losses }: HeadToHead): Rivalry => ({
  opponentId,
  games,
  wins,
  losses,
});

/**
 * "Seu maior rival" (quem mais venceu você nas partidas em que os dois jogaram) e "seu freguês"
 * (quem você mais venceu), com no mínimo 3 partidas juntos. A mesma pessoa não ocupa os dois
 * lugares: fica onde o saldo aponta, e o outro lugar vai para a próxima pessoa.
 */
export function rivalriesFor(
  headToHead: readonly HeadToHead[],
  userId: string,
  minGames = RIVALRY_MIN_GAMES,
): { rival: Rivalry | null; prey: Rivalry | null } {
  const mine = headToHead.filter((h) => h.userId === userId && h.games >= minGames);
  const rivals = mine
    .filter((h) => h.losses > 0)
    .sort((a, b) => b.losses - a.losses || b.games - a.games);
  const preys = mine.filter((h) => h.wins > 0).sort((a, b) => b.wins - a.wins || b.games - a.games);
  let rival = rivals[0] ?? null;
  let prey = preys[0] ?? null;
  if (rival && prey && rival.opponentId === prey.opponentId) {
    if (prey.wins > prey.losses) rival = rivals[1] ?? null;
    else prey = preys[1] ?? null;
  }
  return { rival: rival ? pick(rival) : null, prey: prey ? pick(prey) : null };
}

/** Confronto entre duas pessoas (no perfil de outra pessoa), ou `null` se nunca jogaram juntas. */
export function headToHeadBetween(
  headToHead: readonly HeadToHead[],
  userId: string,
  otherId: string,
): { games: number; wins: number; losses: number } | null {
  const row = headToHead.find((h) => h.userId === userId && h.opponentId === otherId);
  return row && row.games > 0 ? { games: row.games, wins: row.wins, losses: row.losses } : null;
}
