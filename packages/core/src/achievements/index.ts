import type { GameResult } from '../ranking';

/** Partida do ponto de vista de um jogador (para calcular conquistas). */
export interface AchievementGame {
  playedAt: Date;
  format: string;
  firstPlayerId: string | null;
  winningTurn: number | null;
  players: { userId: string; result: GameResult; deckId: string | null }[];
}

export interface SeasonTitle {
  seasonName: string;
  groupName: string;
  endsAt: Date;
}

export const ACHIEVEMENT_IDS = [
  'first_game',
  'first_win',
  'games_10',
  'games_50',
  'wins_10',
  'streak_3',
  'streak_5',
  'fast_win',
  'first_player_win',
  'deck_loyal',
  'deck_variety',
  'versatile',
  'team_win',
  'season_champion',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface Achievement {
  id: AchievementId;
  unlocked: boolean;
  /** Quando foi conquistada (partida que completou o objetivo). */
  unlockedAt: Date | null;
  progress: number;
  target: number;
  /** Quantas vezes (ex.: temporadas vencidas). */
  count?: number;
}

/** Turno máximo para "vitória relâmpago". */
export const FAST_WIN_TURN = 6;

/**
 * Conquistas (2.12) calculadas a partir das partidas do jogador, em ordem cronológica,
 * registrando a data em que cada objetivo foi alcançado. Sem tabela própria: sempre coerente
 * com as partidas (editar/remover uma partida recalcula tudo).
 */
export function computeAchievements(
  userId: string,
  games: readonly AchievementGame[],
  seasonTitles: readonly SeasonTitle[] = [],
): Achievement[] {
  const ordered = [...games]
    .filter((g) => g.players.some((p) => p.userId === userId))
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  const unlockedAt = new Map<AchievementId, Date>();
  const unlock = (id: AchievementId, when: Date) => {
    if (!unlockedAt.has(id)) unlockedAt.set(id, when);
  };

  let played = 0;
  let wins = 0;
  let streak = 0;
  let bestStreak = 0;
  const gamesByDeck = new Map<string, number>();
  const winningDecks = new Set<string>();
  const formats = new Set<string>();

  for (const game of ordered) {
    const me = game.players.find((p) => p.userId === userId)!;
    const won = me.result === 'win';
    played += 1;
    formats.add(game.format);
    unlock('first_game', game.playedAt);
    if (played >= 10) unlock('games_10', game.playedAt);
    if (played >= 50) unlock('games_50', game.playedAt);
    if (formats.size >= 3) unlock('versatile', game.playedAt);
    if (me.deckId) {
      const n = (gamesByDeck.get(me.deckId) ?? 0) + 1;
      gamesByDeck.set(me.deckId, n);
      if (n >= 10) unlock('deck_loyal', game.playedAt);
    }
    if (won) {
      wins += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      unlock('first_win', game.playedAt);
      if (wins >= 10) unlock('wins_10', game.playedAt);
      if (streak >= 3) unlock('streak_3', game.playedAt);
      if (streak >= 5) unlock('streak_5', game.playedAt);
      if (game.winningTurn !== null && game.winningTurn <= FAST_WIN_TURN) {
        unlock('fast_win', game.playedAt);
      }
      if (game.firstPlayerId === userId) unlock('first_player_win', game.playedAt);
      if (game.format === 'two_headed_giant') unlock('team_win', game.playedAt);
      if (me.deckId) {
        winningDecks.add(me.deckId);
        if (winningDecks.size >= 3) unlock('deck_variety', game.playedAt);
      }
    } else {
      streak = 0;
    }
  }
  const titles = [...seasonTitles].sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
  if (titles.length) unlock('season_champion', titles[0]!.endsAt);

  const progress: Record<AchievementId, [number, number]> = {
    first_game: [played, 1],
    first_win: [wins, 1],
    games_10: [played, 10],
    games_50: [played, 50],
    wins_10: [wins, 10],
    streak_3: [bestStreak, 3],
    streak_5: [bestStreak, 5],
    fast_win: [unlockedAt.has('fast_win') ? 1 : 0, 1],
    first_player_win: [unlockedAt.has('first_player_win') ? 1 : 0, 1],
    deck_loyal: [Math.max(0, ...gamesByDeck.values()), 10],
    deck_variety: [winningDecks.size, 3],
    versatile: [formats.size, 3],
    team_win: [unlockedAt.has('team_win') ? 1 : 0, 1],
    season_champion: [titles.length, 1],
  };

  return ACHIEVEMENT_IDS.map((id) => {
    const [current, target] = progress[id];
    return {
      id,
      unlocked: unlockedAt.has(id),
      unlockedAt: unlockedAt.get(id) ?? null,
      progress: Math.min(current, target),
      target,
      ...(id === 'season_champion' ? { count: titles.length } : {}),
    };
  });
}
