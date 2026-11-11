import { describe, expect, it } from 'vitest';
import { computeGroupStats, gamesByMonth, RECENT_RESULTS, resolvePeriod, type StatsGame } from '.';

let n = 0;
const game = (
  players: [string, 'win' | 'loss' | 'draw', Partial<StatsGame['players'][number]>?][],
  extra: Partial<StatsGame> = {},
): StatsGame => {
  n += 1;
  return {
    gameId: `g${n}`,
    playedAt: new Date(Date.UTC(2026, 0, n)),
    format: 'commander',
    firstPlayerId: null,
    winningTurn: null,
    durationMinutes: null,
    players: players.map(([userId, result, more], i) => ({
      userId,
      result,
      deckId: null,
      seat: i + 1,
      team: null,
      eliminatedOrder: null,
      ...more,
    })),
    ...extra,
  };
};

describe('computeGroupStats', () => {
  const games = [
    game(
      [
        ['ana', 'win', { deckId: 'omnath' }],
        ['bia', 'loss', { eliminatedOrder: 2 }],
        ['caio', 'loss', { eliminatedOrder: 1 }],
      ],
      { firstPlayerId: 'ana', winningTurn: 8, durationMinutes: 90 },
    ),
    game(
      [
        ['ana', 'win', { deckId: 'omnath' }],
        ['bia', 'loss'],
        ['caio', 'loss', { eliminatedOrder: 1 }],
      ],
      { firstPlayerId: 'bia', winningTurn: 10 },
    ),
    game([
      ['ana', 'loss', { deckId: 'omnath' }],
      ['bia', 'win', { deckId: 'yuriko' }],
      ['caio', 'loss'],
    ]),
    // Two-Headed Giant: Ana e Caio contra Bia e Duda.
    game(
      [
        ['ana', 'win', { team: 1 }],
        ['caio', 'win', { team: 1 }],
        ['bia', 'loss', { team: 2 }],
        ['duda', 'loss', { team: 2 }],
      ],
      { format: 'two_headed_giant' },
    ),
    game([
      ['bia', 'draw'],
      ['caio', 'draw'],
    ]),
  ];
  // Ordem embaralhada: o cálculo ordena por data.
  const stats = computeGroupStats([games[3]!, games[0]!, games[4]!, games[2]!, games[1]!]);
  const of = (id: string) => stats.players.find((p) => p.userId === id)!;

  it('sequências, quem começa e primeiro a sair', () => {
    expect(stats.totalGames).toBe(5);
    expect(of('ana')).toMatchObject({
      games: 4,
      wins: 3,
      bestStreak: 2,
      currentStreak: 1,
      gamesFirst: 1,
      winsFirst: 1,
    });
    expect(of('bia')).toMatchObject({ wins: 1, currentStreak: 0, bestStreak: 1, gamesFirst: 1 });
    expect(of('caio')).toMatchObject({ firstOut: 2, currentStreak: 0, bestStreak: 1 });
    expect(stats.players[0]!.userId).toBe('ana');
  });

  it('confronto direto ignora o próprio time', () => {
    const pair = (a: string, b: string) =>
      stats.headToHead.find((h) => h.userId === a && h.opponentId === b);
    expect(pair('ana', 'bia')).toEqual({
      userId: 'ana',
      opponentId: 'bia',
      games: 4,
      wins: 3,
      losses: 1,
    });
    expect(pair('ana', 'caio')).toMatchObject({ games: 3, wins: 2, losses: 0 }); // 2HG: mesmo time
    expect(pair('caio', 'duda')).toMatchObject({ games: 1, wins: 1, losses: 0 });
    expect(pair('bia', 'caio')).toMatchObject({ games: 5, wins: 1, losses: 1 });
  });

  it('decks, médias, quem começa e posição na mesa', () => {
    expect(stats.decks).toEqual([
      expect.objectContaining({ deckId: 'omnath', userId: 'ana', games: 3, wins: 2 }),
      expect.objectContaining({ deckId: 'yuriko', userId: 'bia', games: 1, wins: 1, winRate: 1 }),
    ]);
    expect(stats.decks[0]!.winRate).toBeCloseTo(2 / 3);
    expect(stats.averageWinningTurn).toBe(9);
    expect(stats.averageDurationMinutes).toBe(90);
    expect(stats.firstPlayerWinRate).toBe(0.5);
    expect(stats.firstPlayerSample).toBe(2);
    expect(stats.winsBySeat).toEqual([
      { seat: 1, games: 3, wins: 2 },
      { seat: 2, games: 3, wins: 1 },
      { seat: 3, games: 3, wins: 0 },
    ]);
  });

  it('sem partidas', () => {
    expect(computeGroupStats([])).toMatchObject({
      totalGames: 0,
      players: [],
      averageWinningTurn: null,
      firstPlayerWinRate: null,
    });
  });
});

describe('forma recente e atividade por mês', () => {
  it('guarda os últimos resultados de cada jogador, do mais antigo ao mais novo', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      game([
        ['ana', i % 3 === 0 ? 'loss' : 'win'],
        ['bia', i % 3 === 0 ? 'win' : 'loss'],
      ]),
    );
    const ana = computeGroupStats(many).players.find((p) => p.userId === 'ana')!;
    expect(ana.recent).toHaveLength(RECENT_RESULTS);
    expect(ana.recent.at(-1)).toBe('win');
    expect(ana.recent.slice(0, 2)).toEqual(['win', 'loss']);
  });

  it('conta partidas por mês no fuso do grupo, com zeros nos meses vazios', () => {
    const now = new Date('2026-11-07T15:00:00Z');
    expect(
      gamesByMonth(
        [
          { playedAt: new Date('2026-11-02T22:00:00Z') },
          { playedAt: new Date('2026-11-01T01:00:00Z') }, // 31/out 22h em São Paulo
          { playedAt: new Date('2026-09-10T22:00:00Z') },
          { playedAt: new Date('2025-01-10T22:00:00Z') },
        ],
        { now, months: 3 },
      ),
    ).toEqual([
      { month: '2026-09', games: 1 },
      { month: '2026-10', games: 1 },
      { month: '2026-11', games: 1 },
    ]);
  });
});

describe('resolvePeriod', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const seasons = [
    {
      id: 's1',
      name: '2º semestre',
      startsAt: new Date('2026-07-01T03:00:00Z'),
      endsAt: new Date('2027-01-01T03:00:00Z'),
    },
  ];
  const opts = { now, timeZone: 'America/Sao_Paulo', seasons };

  it('resolve os períodos e cai em "all" quando não reconhece', () => {
    expect(resolvePeriod(undefined, opts)).toEqual({ period: 'all' });
    expect(resolvePeriod('season:zzz', opts)).toEqual({ period: 'all' });
    expect(resolvePeriod('last30', opts)).toEqual({
      period: 'last30',
      from: new Date('2026-10-06T12:00:00Z'),
    });
    expect(resolvePeriod('thisYear', opts)).toEqual({
      period: 'thisYear',
      from: new Date('2026-01-01T03:00:00Z'),
      to: new Date('2027-01-01T03:00:00Z'),
    });
    expect(resolvePeriod('season:s1', opts)).toMatchObject({
      period: 'season:s1',
      from: seasons[0]!.startsAt,
      season: { name: '2º semestre' },
    });
  });
});
