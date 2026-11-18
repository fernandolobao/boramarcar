import type { GameResult } from '../ranking';

/** Partida do ponto de vista de um jogador (para calcular conquistas). */
export interface AchievementGame {
  playedAt: Date;
  format: string;
  firstPlayerId: string | null;
  winningTurn: number | null;
  /** Grupo e encontro da partida (para "2 grupos", "Nêmesis" e "4 encontros seguidos"). */
  groupId?: string | null;
  eventId?: string | null;
  players: {
    userId: string;
    result: GameResult;
    deckId: string | null;
    /** O deck usado tem proxies (hoje). */
    deckHasProxies?: boolean;
  }[];
}

/** Dados do grupo que algumas conquistas precisam além das partidas. */
export interface AchievementContext {
  /** Membros atuais de cada grupo do jogador (incluindo ele). */
  groupMembers?: Record<string, readonly string[]>;
  /** Encontros com partida registrada nos grupos do jogador. */
  groupEvents?: readonly { groupId: string; eventId: string; startsAt: Date }[];
  /** Fuso para "12 meses de um ano" (padrão: São Paulo). */
  timeZone?: string;
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
  'games_100',
  'wins_25',
  'wins_50',
  'decks_5',
  'groups_2',
  'opponents_10',
  'nemesis',
  'underdog_10',
  'proxy_win',
  'comeback',
  'events_streak_4',
  'months_12',
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
  context: AchievementContext = {},
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
  const decksPlayed = new Set<string>();
  const groupsPlayed = new Set<string>();
  const opponents = new Set<string>();
  /** Em cada grupo, quem o jogador já venceu numa partida. */
  const beaten = new Map<string, Set<string>>();
  let underdogWins = 0;
  let losingStreak = 0;
  const monthKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: context.timeZone ?? 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  });
  const monthsByYear = new Map<string, Set<string>>();
  /** Primeira partida do jogador em cada encontro. */
  const firstGameInEvent = new Map<string, Date>();

  for (const game of ordered) {
    const me = game.players.find((p) => p.userId === userId)!;
    const won = me.result === 'win';
    played += 1;
    formats.add(game.format);
    if (played >= 100) unlock('games_100', game.playedAt);
    if (me.deckId) {
      decksPlayed.add(me.deckId);
      if (decksPlayed.size >= 5) unlock('decks_5', game.playedAt);
    }
    if (game.groupId) {
      groupsPlayed.add(game.groupId);
      if (groupsPlayed.size >= 2) unlock('groups_2', game.playedAt);
    }
    for (const p of game.players) if (p.userId !== userId) opponents.add(p.userId);
    if (opponents.size >= 10) unlock('opponents_10', game.playedAt);
    if (game.eventId && !firstGameInEvent.has(game.eventId)) {
      firstGameInEvent.set(game.eventId, game.playedAt);
    }
    const [year, month] = monthKey.format(game.playedAt).split('-') as [string, string];
    const months = monthsByYear.get(year) ?? new Set<string>();
    months.add(month);
    monthsByYear.set(year, months);
    if (months.size >= 12) unlock('months_12', game.playedAt);
    if (won) {
      if (losingStreak >= 5) unlock('comeback', game.playedAt);
      losingStreak = 0;
      if (me.deckHasProxies) unlock('proxy_win', game.playedAt);
      if (game.firstPlayerId && game.firstPlayerId !== userId) {
        underdogWins += 1;
        if (underdogWins >= 10) unlock('underdog_10', game.playedAt);
      }
      if (game.groupId) {
        const set = beaten.get(game.groupId) ?? new Set<string>();
        for (const p of game.players)
          if (p.userId !== userId && p.result !== 'win') set.add(p.userId);
        beaten.set(game.groupId, set);
        const others = (context.groupMembers?.[game.groupId] ?? []).filter((u) => u !== userId);
        if (others.length >= 2 && others.every((u) => set.has(u))) unlock('nemesis', game.playedAt);
      }
    } else if (me.result === 'loss') {
      losingStreak += 1;
    }
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
      if (wins >= 25) unlock('wins_25', game.playedAt);
      if (wins >= 50) unlock('wins_50', game.playedAt);
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
  // Encontros seguidos do grupo (só os que tiveram partida) em que o jogador jogou.
  let bestEventRun = 0;
  const eventsByGroup = new Map<string, { eventId: string; startsAt: Date }[]>();
  for (const e of context.groupEvents ?? []) {
    eventsByGroup.set(e.groupId, [...(eventsByGroup.get(e.groupId) ?? []), e]);
  }
  for (const list of eventsByGroup.values()) {
    let run = 0;
    for (const e of [...list].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
      const when = firstGameInEvent.get(e.eventId);
      run = when ? run + 1 : 0;
      bestEventRun = Math.max(bestEventRun, run);
      if (run >= 4 && when) unlock('events_streak_4', when);
    }
  }
  // Nêmesis: o grupo em que o jogador está mais perto de ter vencido todo mundo.
  let nemesis: [number, number] = [0, 1];
  for (const [groupId, members] of Object.entries(context.groupMembers ?? {})) {
    const others = members.filter((u) => u !== userId);
    if (others.length < 2) continue;
    const done = others.filter((u) => beaten.get(groupId)?.has(u)).length;
    if (done / others.length > nemesis[0] / nemesis[1] || nemesis[0] === 0) {
      nemesis = [done, others.length];
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
    games_100: [played, 100],
    wins_25: [wins, 25],
    wins_50: [wins, 50],
    decks_5: [decksPlayed.size, 5],
    groups_2: [groupsPlayed.size, 2],
    opponents_10: [opponents.size, 10],
    nemesis: unlockedAt.has('nemesis') ? [nemesis[1], nemesis[1]] : nemesis,
    underdog_10: [underdogWins, 10],
    proxy_win: [unlockedAt.has('proxy_win') ? 1 : 0, 1],
    comeback: [unlockedAt.has('comeback') ? 1 : 0, 1],
    events_streak_4: [bestEventRun, 4],
    months_12: [Math.max(0, ...[...monthsByYear.values()].map((m) => m.size)), 12],
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
