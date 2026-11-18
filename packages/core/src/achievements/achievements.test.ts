import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_IDS,
  computeAchievements,
  splitAchievements,
  type Achievement,
  type AchievementGame,
  type AchievementId,
} from '.';

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
});
