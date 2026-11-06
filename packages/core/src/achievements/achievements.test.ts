import { describe, expect, it } from 'vitest';
import { computeAchievements, type AchievementGame } from '.';

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
    expect(list).toHaveLength(14);
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
