import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_IDS,
  computeAchievements,
  splitAchievements,
  type Achievement,
  type AchievementGame,
  type AchievementId,
} from '.';
import { challengeIdsOf, LEARN_TRACKS, LESSON_IDS } from '../learn';

let day = 0;
const game = (
  result: 'win' | 'loss' | 'draw',
  extra: Partial<AchievementGame> & { deckId?: string | null } = {},
): AchievementGame => {
  day += 1;
  const { deckId = null, ...rest } = extra;
  return {
    playedAt: new Date(Date.UTC(2026, 0, day)),
    format: 'commander',
    firstPlayerId: null,
    winningTurn: null,
    players: [
      { userId: 'me', result, deckId },
      {
        userId: 'other',
        result: result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw',
        deckId: null,
      },
    ],
    ...rest,
  };
};
const byId = (list: ReturnType<typeof computeAchievements>) =>
  Object.fromEntries(list.map((a) => [a.id, a]));

describe('conquistas', () => {
  it('sem partidas: tudo bloqueado com progresso zero', () => {
    const list = computeAchievements('me', []);
    expect(list).toHaveLength(ACHIEVEMENT_IDS.length);
    expect(list.every((a) => !a.unlocked && a.progress === 0 && a.unlockedAt === null)).toBe(true);
  });

  it('desbloqueia na data da partida que completou o objetivo', () => {
    const games = [
      game('loss'),
      game('win', { deckId: 'a', firstPlayerId: 'me', winningTurn: 5 }),
      game('win', { deckId: 'b' }),
      game('win', { deckId: 'c', format: 'modern' }),
      game('loss', { format: 'two_headed_giant' }),
      game('win', { format: 'two_headed_giant' }),
    ];
    const a = byId(
      computeAchievements('me', [...games].reverse(), [
        { seasonName: 'S2', groupName: 'G', endsAt: new Date('2026-07-01') },
        { seasonName: 'S1', groupName: 'G', endsAt: new Date('2026-01-01') },
      ]),
    );
    expect(a.first_game!.unlockedAt).toEqual(games[0]!.playedAt);
    expect(a.first_win).toMatchObject({ unlocked: true, unlockedAt: games[1]!.playedAt });
    expect(a.fast_win!.unlocked).toBe(true);
    expect(a.first_player_win!.unlocked).toBe(true);
    expect(a.streak_3).toMatchObject({ unlocked: true, unlockedAt: games[3]!.playedAt });
    expect(a.streak_5).toMatchObject({ unlocked: false, progress: 3, target: 5 });
    expect(a.deck_variety).toMatchObject({ unlocked: true, progress: 3 });
    expect(a.versatile).toMatchObject({ unlocked: true, unlockedAt: games[4]!.playedAt });
    expect(a.team_win!.unlocked).toBe(true);
    expect(a.games_10).toMatchObject({ unlocked: false, progress: 6, target: 10 });
    expect(a.season_champion).toMatchObject({
      unlocked: true,
      count: 2,
      unlockedAt: new Date('2026-01-01'),
    });
  });

  it('vitória lenta não conta como relâmpago; 10 partidas com o mesmo deck', () => {
    const games = Array.from({ length: 10 }, () => game('loss', { deckId: 'x', winningTurn: 9 }));
    games.push(game('win', { winningTurn: 7 }));
    const a = byId(computeAchievements('me', games));
    expect(a.fast_win!.unlocked).toBe(false);
    expect(a.deck_loyal).toMatchObject({ unlocked: true, unlockedAt: games[9]!.playedAt });
    expect(a.games_10!.unlocked).toBe(true);
    expect(a.streak_3!.progress).toBe(1);
  });
});

describe('conquistas novas', () => {
  const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 15));
  const play = (
    playedAt: Date,
    result: 'win' | 'loss',
    over: Partial<AchievementGame> & { opponents?: string[]; deckId?: string | null } = {},
  ): AchievementGame => {
    const { opponents = ['other'], deckId = null, ...rest } = over;
    return {
      playedAt,
      format: 'commander',
      firstPlayerId: null,
      winningTurn: null,
      groupId: 'g1',
      eventId: null,
      players: [
        { userId: 'me', result, deckId },
        ...opponents.map((userId) => ({
          userId,
          result: (result === 'win' ? 'loss' : 'win') as 'win' | 'loss',
          deckId: null,
        })),
      ],
      ...rest,
    };
  };
  const days = (n: number, result: 'win' | 'loss', over = {}) =>
    Array.from({ length: n }, (_, i) => play(at(2026, 0, 1 + i), result, over));

  it('100 partidas, 25 e 50 vitórias', () => {
    const a = byId(computeAchievements('me', [...days(50, 'win'), ...days(50, 'loss')]));
    expect(a.games_100!.unlocked).toBe(true);
    expect(a.wins_25!.unlocked).toBe(true);
    expect(a.wins_50!.unlocked).toBe(true);
    expect(byId(computeAchievements('me', days(99, 'win'))).games_100!.progress).toBe(99);
  });

  it('jogou com 5 decks diferentes', () => {
    const games = ['a', 'b', 'c', 'd', 'e'].map((deckId, i) =>
      play(at(2026, 0, i + 1), 'loss', { deckId }),
    );
    const a = byId(computeAchievements('me', games));
    expect(a.decks_5).toMatchObject({ unlocked: true, unlockedAt: at(2026, 0, 5) });
    expect(byId(computeAchievements('me', games.slice(0, 4))).decks_5!.progress).toBe(4);
  });

  it('jogou em 2 grupos', () => {
    const a = byId(
      computeAchievements('me', [
        play(at(2026, 0, 1), 'loss'),
        play(at(2026, 0, 2), 'loss', { groupId: 'g2' }),
      ]),
    );
    expect(a.groups_2!.unlocked).toBe(true);
  });

  it('jogou com 10 pessoas diferentes', () => {
    const people = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const games = [
      play(at(2026, 0, 1), 'loss', { opponents: people.slice(0, 5) }),
      play(at(2026, 0, 2), 'loss', { opponents: people.slice(5) }),
    ];
    expect(byId(computeAchievements('me', games)).opponents_10).toMatchObject({
      unlocked: true,
      unlockedAt: at(2026, 0, 2),
    });
  });

  it('Nêmesis: venceu cada pessoa do grupo ao menos uma vez', () => {
    const members = { g1: ['me', 'ana', 'bia', 'caio'] };
    const games = [
      play(at(2026, 0, 1), 'win', { opponents: ['ana', 'bia'] }),
      play(at(2026, 0, 2), 'loss', { opponents: ['caio'] }),
      play(at(2026, 0, 3), 'win', { opponents: ['caio'] }),
    ];
    const a = byId(computeAchievements('me', games, [], { groupMembers: members }));
    expect(a.nemesis).toMatchObject({ unlocked: true, unlockedAt: at(2026, 0, 3) });
    const partial = byId(
      computeAchievements('me', games.slice(0, 2), [], { groupMembers: members }),
    );
    expect(partial.nemesis).toMatchObject({ unlocked: false, progress: 2, target: 3 });
  });

  it('venceu 10 vezes sem ser o primeiro a jogar', () => {
    const wins = days(10, 'win', { firstPlayerId: 'other' });
    expect(byId(computeAchievements('me', wins)).underdog_10!.unlocked).toBe(true);
    // Começar não conta.
    const started = days(10, 'win', { firstPlayerId: 'me' });
    expect(byId(computeAchievements('me', started)).underdog_10!.unlocked).toBe(false);
  });

  it('venceu com um deck que tem proxies', () => {
    const game = play(at(2026, 0, 1), 'win', { deckId: 'd1' });
    game.players[0]!.deckHasProxies = true;
    expect(byId(computeAchievements('me', [game])).proxy_win!.unlocked).toBe(true);
  });

  it('Volta por cima: venceu depois de 5 derrotas seguidas', () => {
    const games = [...days(5, 'loss'), play(at(2026, 1, 1), 'win')];
    expect(byId(computeAchievements('me', games)).comeback).toMatchObject({
      unlocked: true,
      unlockedAt: at(2026, 1, 1),
    });
    const short = [...days(4, 'loss'), play(at(2026, 1, 1), 'win')];
    expect(byId(computeAchievements('me', short)).comeback!.unlocked).toBe(false);
  });

  it('jogou em 4 encontros seguidos do grupo (encontros com partida)', () => {
    const groupEvents = ['e1', 'e2', 'e3', 'e4', 'e5'].map((eventId, i) => ({
      groupId: 'g1',
      eventId,
      startsAt: at(2026, 0, 1 + i * 7),
    }));
    const mine = (ids: string[]) =>
      ids.map((eventId) => {
        const i = Number(eventId.slice(1)) - 1;
        return play(at(2026, 0, 1 + i * 7), 'loss', { eventId });
      });
    const streak = byId(
      computeAchievements('me', mine(['e2', 'e3', 'e4', 'e5']), [], { groupEvents }),
    );
    expect(streak.events_streak_4).toMatchObject({ unlocked: true, unlockedAt: at(2026, 0, 29) });
    // Faltou ao e3: a sequência recomeça.
    const broken = byId(
      computeAchievements('me', mine(['e1', 'e2', 'e4', 'e5']), [], { groupEvents }),
    );
    expect(broken.events_streak_4).toMatchObject({ unlocked: false, progress: 2 });
  });

  it('jogou nos 12 meses de um mesmo ano (no fuso da pessoa)', () => {
    const year = Array.from({ length: 12 }, (_, m) => play(at(2025, m, 10), 'loss'));
    expect(byId(computeAchievements('me', year)).months_12).toMatchObject({
      unlocked: true,
      unlockedAt: at(2025, 11, 10),
    });
    // 1º de janeiro, 01h UTC ainda é 31/12 em São Paulo: dezembro de 2025 vale, janeiro de 2026 não.
    const eleven = year.slice(0, 11);
    const lateNight = play(new Date(Date.UTC(2026, 0, 1, 1)), 'loss');
    expect(
      byId(computeAchievements('me', [...eleven, lateNight], [], { timeZone: 'America/Sao_Paulo' }))
        .months_12!.unlocked,
    ).toBe(true);
  });
});

describe('abas de conquistas', () => {
  const a = (
    id: AchievementId,
    unlocked: boolean,
    progress: number,
    target: number,
    unlockedAt: Date | null = null,
  ): Achievement => ({ id, unlocked, progress, target, unlockedAt });

  it('"para conquistar" mostra primeiro as mais perto de sair; "conquistadas", as mais recentes', () => {
    const { pending, done } = splitAchievements([
      a('games_100', false, 10, 100),
      a('first_win', true, 1, 1, new Date('2026-01-02')),
      a('wins_10', false, 9, 10),
      a('streak_3', true, 3, 3, new Date('2026-03-01')),
      a('fast_win', false, 0, 1),
    ]);
    expect(pending.map((x) => x.id)).toEqual(['wins_10', 'games_100', 'fast_win']);
    expect(done.map((x) => x.id)).toEqual(['streak_3', 'first_win']);
  });

  it('Enturmado: jogou com cada pessoa de um grupo de 4+ (quem era membro na data da partida)', () => {
    const day = (d: number) => new Date(Date.UTC(2026, 0, d, 22));
    const memberSince = {
      g1: { me: day(1), ana: day(1), bia: day(1), caio: day(1), novo: day(20) },
    };
    const vs = (d: number, opponents: string[]) =>
      ({
        playedAt: day(d),
        format: 'commander',
        firstPlayerId: null,
        winningTurn: null,
        groupId: 'g1',
        eventId: null,
        players: [
          { userId: 'me', result: 'loss', deckId: null },
          ...opponents.map((userId) => ({ userId, result: 'win', deckId: null })),
        ],
      }) as AchievementGame;
    const games = [vs(2, ['ana', 'bia']), vs(3, ['caio'])];
    const a = Object.fromEntries(
      computeAchievements('me', games, [], { memberSince }).map((x) => [x.id, x]),
    );
    // No dia 3, os membros eram me, ana, bia e caio (o "novo" entrou depois): já jogou com todos.
    expect(a.enturmado).toMatchObject({ unlocked: true, unlockedAt: day(3) });
    // Grupo com menos de 4 pessoas não conta.
    const small = { g1: { me: day(1), ana: day(1), bia: day(1) } };
    const b = Object.fromEntries(
      computeAchievements('me', [vs(2, ['ana', 'bia'])], [], { memberSince: small }).map((x) => [
        x.id,
        x,
      ]),
    );
    expect(b.enturmado!.unlocked).toBe(false);
  });
});

describe('conquistas de torneio', () => {
  const byId = (list: ReturnType<typeof computeAchievements>, id: string) =>
    list.find((a) => a.id === id)!;

  it('estreia, top cut e campeão (com quantas vezes), pela data em que o torneio acabou', () => {
    const jan = new Date('2026-01-10T23:00:00Z');
    const mar = new Date('2026-03-10T23:00:00Z');
    const may = new Date('2026-05-10T23:00:00Z');
    const list = computeAchievements('u1', [], [], {
      tournaments: [
        { finishedAt: may, champion: true, topCut: true },
        { finishedAt: jan, champion: false, topCut: false },
        { finishedAt: mar, champion: false, topCut: true },
      ],
    });
    expect(byId(list, 'tournament_first')).toMatchObject({ unlocked: true, unlockedAt: jan });
    expect(byId(list, 'tournament_top')).toMatchObject({ unlocked: true, unlockedAt: mar });
    expect(byId(list, 'tournament_champion')).toMatchObject({
      unlocked: true,
      unlockedAt: may,
      count: 1,
    });
  });

  it('sem torneio, nada desbloqueado', () => {
    const list = computeAchievements('u1', []);
    for (const id of ['tournament_first', 'tournament_top', 'tournament_champion']) {
      expect(byId(list, id)).toMatchObject({ unlocked: false, progress: 0, target: 1 });
    }
  });
});

describe('conquistas da trilha "Aprender a jogar" (12.1)', () => {
  const find = (list: Achievement[], id: AchievementId) => list.find((a) => a.id === id)!;
  const at = (d: number) => new Date(Date.UTC(2026, 10, d));
  const lessons = (ids: readonly string[]) =>
    ids.map((lessonId, i) => ({ lessonId, completedAt: at(i + 1) }));
  const all = [
    'o-que-e-magic',
    'tipos-de-carta',
    'mana-e-terrenos',
    'o-turno',
    'combate',
    'a-pilha',
    'como-se-vence',
  ];

  it('primeira lição e trilha completa, com a data da última lição', () => {
    const partial = computeAchievements('me', [], [], { lessons: lessons(all.slice(0, 3)) });
    expect(find(partial, 'learn_first')).toMatchObject({ unlocked: true, unlockedAt: at(1) });
    expect(find(partial, 'learn_path')).toMatchObject({ unlocked: false, progress: 3, target: 7 });
    const full = computeAchievements('me', [], [], { lessons: lessons(all) });
    expect(find(full, 'learn_path')).toMatchObject({ unlocked: true, unlockedAt: at(7) });
    expect(find(full, 'learn_to_table')).toMatchObject({ unlocked: false, progress: 0 });
  });

  it('"da teoria à mesa": a primeira partida depois de concluir a trilha', () => {
    const before = { ...game('loss'), playedAt: at(5) };
    const after = { ...game('loss'), playedAt: at(9) };
    const list = computeAchievements('me', [before, after], [], { lessons: lessons(all) });
    expect(find(list, 'learn_to_table')).toMatchObject({ unlocked: true, unlockedAt: at(9) });
    const onlyBefore = computeAchievements('me', [before], [], { lessons: lessons(all) });
    expect(find(onlyBefore, 'learn_to_table').unlocked).toBe(false);
  });

  it('"pronto para o Commander": o bloco de Commander; o básico não depende dele', () => {
    const commander = [
      'commander-o-formato',
      'identidade-de-cor',
      'mesa-de-commander',
      'rule-0-e-brackets',
    ];
    const list = computeAchievements('me', [], [], { lessons: lessons([...all, ...commander]) });
    expect(find(list, 'learn_commander')).toMatchObject({ unlocked: true, unlockedAt: at(11) });
    expect(find(list, 'learn_path')).toMatchObject({ unlocked: true, unlockedAt: at(7) });
    const onlyCommander = computeAchievements('me', [], [], { lessons: lessons(commander) });
    expect(find(onlyCommander, 'learn_commander').unlocked).toBe(true);
    expect(find(onlyCommander, 'learn_path')).toMatchObject({ unlocked: false, progress: 0 });
  });

  it('"desafios vencidos": acertar todos os desafios; desafio não conta como lição', () => {
    const challenges = [
      'desafio-voar',
      'desafio-pilha',
      'desafio-toque-mortifero',
      'desafio-atropelar',
      'desafio-enjoo',
      'desafio-mana',
      'desafio-dano-de-comandante',
    ];
    const list = computeAchievements('me', [], [], { lessons: lessons(challenges) });
    expect(find(list, 'learn_challenges')).toMatchObject({ unlocked: true, unlockedAt: at(7) });
    expect(find(list, 'learn_first').unlocked).toBe(false);
    const some = computeAchievements('me', [], [], { lessons: lessons(challenges.slice(0, 2)) });
    expect(find(some, 'learn_challenges')).toMatchObject({
      unlocked: false,
      progress: 2,
      target: 7,
    });
  });

  it('"além do básico": as lições intermediárias; os desafios intermediários; e "mestre da trilha" com tudo', () => {
    const intermediate = [...LEARN_TRACKS.intermediate];
    const basicChallenges = challengeIdsOf('basic');
    const hardChallenges = challengeIdsOf('intermediate');
    // Só as lições intermediárias.
    let list = computeAchievements('me', [], [], { lessons: lessons(intermediate) });
    expect(find(list, 'learn_intermediate')).toMatchObject({
      unlocked: true,
      unlockedAt: at(intermediate.length),
    });
    expect(find(list, 'learn_master').unlocked).toBe(false);
    // Desafios intermediários não contam para "desafios vencidos" (só os básicos).
    list = computeAchievements('me', [], [], { lessons: lessons(hardChallenges) });
    expect(find(list, 'learn_challenges_intermediate')).toMatchObject({
      unlocked: true,
      target: hardChallenges.length,
    });
    expect(find(list, 'learn_challenges')).toMatchObject({ unlocked: false, progress: 0 });
    // Mestre: todas as lições e todos os desafios; a data é a do último item.
    const everything = [...LESSON_IDS, ...basicChallenges, ...hardChallenges];
    list = computeAchievements('me', [], [], { lessons: lessons(everything) });
    expect(find(list, 'learn_master')).toMatchObject({
      unlocked: true,
      unlockedAt: at(everything.length),
      progress: everything.length,
      target: everything.length,
    });
  });

  it('lição que não existe mais não conta', () => {
    const list = computeAchievements('me', [], [], {
      lessons: lessons([...all.slice(0, 6), 'licao-antiga']),
    });
    expect(find(list, 'learn_path')).toMatchObject({ unlocked: false, progress: 6 });
  });
});
