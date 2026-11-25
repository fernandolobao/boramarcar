import { LEARN_TRACKS, LESSON_IDS } from '../learn';
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
  /** Desde quando cada pessoa é membro de cada grupo (para "Enturmado"). */
  memberSince?: Record<string, Record<string, Date>>;
  /** Fuso para "12 meses de um ano" (padrão: São Paulo). */
  timeZone?: string;
  /** Torneios encerrados de que a pessoa participou (9.2): se chegou ao top cut e se venceu. */
  tournaments?: readonly { finishedAt: Date; champion: boolean; topCut: boolean }[];
  /** Lições concluídas da trilha "Aprender a jogar" (12.1). */
  lessons?: readonly { lessonId: string; completedAt: Date }[];
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
  'enturmado',
  'tournament_first',
  'tournament_top',
  'tournament_champion',
  'learn_first',
  'learn_path',
  'learn_to_table',
  'learn_commander',
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
  /** Em cada grupo, com quem o jogador já jogou (para "Enturmado"). */
  const playedWith = new Map<string, Set<string>>();
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
    if (game.groupId) {
      const set = playedWith.get(game.groupId) ?? new Set<string>();
      for (const p of game.players) if (p.userId !== userId) set.add(p.userId);
      playedWith.set(game.groupId, set);
      // Enturmado: jogou com cada pessoa que era membro do grupo na data da partida (grupo de 4+).
      const since = context.memberSince?.[game.groupId] ?? {};
      const members = Object.entries(since)
        .filter(([id, joined]) => id !== userId && joined.getTime() <= game.playedAt.getTime())
        .map(([id]) => id);
      if (members.length >= 3 && members.every((id) => set.has(id))) {
        unlock('enturmado', game.playedAt);
      }
    }
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
  // Enturmado: o grupo (de 4+) em que o jogador está mais perto de ter jogado com todo mundo.
  let enturmado: [number, number] = [0, 1];
  for (const [groupId, since] of Object.entries(context.memberSince ?? {})) {
    const others = Object.keys(since).filter((id) => id !== userId);
    if (others.length < 3) continue;
    const done = others.filter((id) => playedWith.get(groupId)?.has(id)).length;
    if (enturmado[0] === 0 || done / others.length > enturmado[0] / enturmado[1]) {
      enturmado = [done, others.length];
    }
  }

  const cups = [...(context.tournaments ?? [])].sort(
    (a, b) => a.finishedAt.getTime() - b.finishedAt.getTime(),
  );
  const firstCup = cups[0];
  const firstTop = cups.find((c) => c.topCut);
  const titlesWon = cups.filter((c) => c.champion);
  if (firstCup) unlock('tournament_first', firstCup.finishedAt);
  if (firstTop) unlock('tournament_top', firstTop.finishedAt);
  if (titlesWon[0]) unlock('tournament_champion', titlesWon[0].finishedAt);
  // Trilha "Aprender a jogar": só lições que existem hoje contam.
  const lessonsDone = (context.lessons ?? [])
    .filter((l) => (LESSON_IDS as readonly string[]).includes(l.lessonId))
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  if (lessonsDone[0]) unlock('learn_first', lessonsDone[0].completedAt);
  /** Lições feitas de um bloco e quando o bloco ficou completo (a última lição dele). */
  const track = (ids: readonly string[]) => {
    const done = lessonsDone.filter((l) => ids.includes(l.lessonId));
    const count = new Set(done.map((l) => l.lessonId)).size;
    return { count, total: ids.length, at: count === ids.length ? done.at(-1)!.completedAt : null };
  };
  const basics = track(LEARN_TRACKS.basics);
  const commanderTrack = track(LEARN_TRACKS.commander);
  const pathDone = basics.at;
  if (commanderTrack.at) unlock('learn_commander', commanderTrack.at);
  if (pathDone) unlock('learn_path', pathDone);
  const firstTable = pathDone
    ? ordered.find((g) => g.playedAt.getTime() >= pathDone.getTime())
    : undefined;
  if (firstTable) unlock('learn_to_table', firstTable.playedAt);
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
    enturmado: unlockedAt.has('enturmado') ? [enturmado[1], enturmado[1]] : enturmado,
    months_12: [Math.max(0, ...[...monthsByYear.values()].map((m) => m.size)), 12],
    tournament_first: [cups.length ? 1 : 0, 1],
    tournament_top: [firstTop ? 1 : 0, 1],
    tournament_champion: [titlesWon.length ? 1 : 0, 1],
    learn_first: [lessonsDone.length ? 1 : 0, 1],
    learn_path: [basics.count, basics.total],
    learn_to_table: [firstTable ? 1 : 0, 1],
    learn_commander: [commanderTrack.count, commanderTrack.total],
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
      ...(id === 'tournament_champion' ? { count: titlesWon.length } : {}),
    };
  });
}

/**
 * Abas do perfil: "para conquistar" (as mais perto de sair primeiro, pela fração do progresso;
 * empate fica na ordem da lista) e "conquistadas" (as mais recentes primeiro).
 */
export function splitAchievements<
  T extends Pick<Achievement, 'unlocked' | 'progress' | 'target' | 'unlockedAt'>,
>(list: readonly T[]) {
  const ratio = (a: T) => (a.target > 0 ? a.progress / a.target : 0);
  const pending = list
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.unlocked)
    .sort((x, y) => ratio(y.a) - ratio(x.a) || x.i - y.i)
    .map(({ a }) => a);
  const done = list
    .filter((a) => a.unlocked)
    .sort((x, y) => (y.unlockedAt?.getTime() ?? 0) - (x.unlockedAt?.getTime() ?? 0));
  return { pending, done };
}
