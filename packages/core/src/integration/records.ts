/**
 * Recordes e "cara" do grupo (8.12): calculados das partidas, sem dado novo. Em empate, vale quem
 * chegou primeiro (a partida mais antiga).
 */

export interface RecordGame {
  gameId: string;
  eventId: string;
  playedAt: Date;
  winningTurn: number | null;
  durationMinutes: number | null;
  players: { userId: string; result: 'win' | 'loss' | 'draw'; deckId: string | null }[];
}

/** Comandante(s) e identidade de cor de cada deck usado. */
export type RecordDecks = Record<string, { commanders: string; colorIdentity: readonly string[] }>;

export interface GroupRecords {
  fastestWin: {
    gameId: string;
    eventId: string;
    playedAt: Date;
    turn: number;
    winnerIds: string[];
  } | null;
  longestGame: { gameId: string; eventId: string; playedAt: Date; minutes: number } | null;
  /** Maior sequência de vitórias seguidas (2 ou mais), e onde ela chegou ao máximo. */
  longestStreak: { userId: string; length: number; eventId: string; playedAt: Date } | null;
  busiestNight: { eventId: string; games: number; playedAt: Date } | null;
  topCommander: { name: string; wins: number } | null;
}

/** Partidas em ordem (as de mesmo horário ficam na ordem recebida). */
const chronological = (games: readonly RecordGame[]) =>
  games
    .map((g, i) => ({ g, i }))
    .sort((a, b) => a.g.playedAt.getTime() - b.g.playedAt.getTime() || a.i - b.i)
    .map(({ g }) => g);

const winners = (g: RecordGame) => g.players.filter((p) => p.result === 'win').map((p) => p.userId);

export function groupRecords(games: readonly RecordGame[], decks: RecordDecks): GroupRecords {
  const ordered = chronological(games);

  let fastestWin: GroupRecords['fastestWin'] = null;
  let longestGame: GroupRecords['longestGame'] = null;
  for (const g of ordered) {
    const won = winners(g);
    if (g.winningTurn !== null && won.length && (!fastestWin || g.winningTurn < fastestWin.turn)) {
      fastestWin = {
        gameId: g.gameId,
        eventId: g.eventId,
        playedAt: g.playedAt,
        turn: g.winningTurn,
        winnerIds: won,
      };
    }
    if (g.durationMinutes !== null && (!longestGame || g.durationMinutes > longestGame.minutes)) {
      longestGame = {
        gameId: g.gameId,
        eventId: g.eventId,
        playedAt: g.playedAt,
        minutes: g.durationMinutes,
      };
    }
  }

  // Sequência de vitórias de cada pessoa, nas partidas em que ela jogou (derrota ou empate zera).
  let longestStreak: GroupRecords['longestStreak'] = null;
  const streak = new Map<string, number>();
  for (const g of ordered) {
    for (const p of g.players) {
      const n = p.result === 'win' ? (streak.get(p.userId) ?? 0) + 1 : 0;
      streak.set(p.userId, n);
      if (n >= 2 && (!longestStreak || n > longestStreak.length)) {
        longestStreak = { userId: p.userId, length: n, eventId: g.eventId, playedAt: g.playedAt };
      }
    }
  }

  // Noite com mais partidas.
  const nights = new Map<string, { games: number; playedAt: Date }>();
  for (const g of ordered) {
    const n = nights.get(g.eventId) ?? { games: 0, playedAt: g.playedAt };
    n.games += 1;
    nights.set(g.eventId, n);
  }
  let busiestNight: GroupRecords['busiestNight'] = null;
  for (const [eventId, n] of nights) {
    if (!busiestNight || n.games > busiestNight.games) busiestNight = { eventId, ...n };
  }

  // Comandante com mais vitórias (somando os decks com o mesmo comandante).
  const commanderWins = new Map<string, number>();
  for (const g of ordered) {
    for (const p of g.players) {
      const name = p.deckId ? decks[p.deckId]?.commanders : undefined;
      if (name && p.result === 'win') commanderWins.set(name, (commanderWins.get(name) ?? 0) + 1);
    }
  }
  let topCommander: GroupRecords['topCommander'] = null;
  for (const [name, wins] of commanderWins) {
    if (!topCommander || wins > topCommander.wins) topCommander = { name, wins };
  }

  return { fastestWin, longestGame, longestStreak, busiestNight, topCommander };
}

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

/**
 * "Cara do grupo": as cores dos decks jogados (cada deck em cada partida conta as cores da
 * identidade dele; sem cor conta como incolor, C), quantos comandantes diferentes já apareceram e
 * o "meta" do período (comandantes mais jogados desde `since`).
 */
export function groupFace(
  games: readonly RecordGame[],
  decks: RecordDecks,
  options: { since?: Date; metaSize?: number } = {},
) {
  const colors: Record<(typeof COLORS)[number] | 'C', number> = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
  };
  const commanders = new Set<string>();
  const meta = new Map<string, number>();
  for (const g of games) {
    for (const p of g.players) {
      const deck = p.deckId ? decks[p.deckId] : undefined;
      if (!deck) continue;
      const identity = COLORS.filter((c) => deck.colorIdentity.includes(c));
      if (identity.length === 0) colors.C += 1;
      for (const c of identity) colors[c] += 1;
      if (deck.commanders) {
        commanders.add(deck.commanders);
        if (!options.since || g.playedAt >= options.since) {
          meta.set(deck.commanders, (meta.get(deck.commanders) ?? 0) + 1);
        }
      }
    }
  }
  return {
    colors,
    commanders: commanders.size,
    meta: [...meta]
      .map(([name, played]) => ({ name, games: played }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
      .slice(0, options.metaSize ?? 5),
  };
}
