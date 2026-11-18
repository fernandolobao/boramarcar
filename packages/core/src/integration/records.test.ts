import { describe, expect, it } from 'vitest';
import { groupFace, groupRecords, type RecordGame } from './records';

const at = (d: number) => new Date(Date.UTC(2026, 9, d, 23));
const g = (
  id: string,
  eventId: string,
  d: number,
  players: [string, 'win' | 'loss' | 'draw', string | null][],
  extra: Partial<RecordGame> = {},
): RecordGame => ({
  gameId: id,
  eventId,
  playedAt: at(d),
  winningTurn: null,
  durationMinutes: null,
  players: players.map(([userId, result, deckId]) => ({ userId, result, deckId })),
  ...extra,
});

const decks = {
  omnath: { commanders: 'Omnath, Locus of Mana', colorIdentity: ['G'] },
  atraxa: { commanders: 'Atraxa, Praetors’ Voice', colorIdentity: ['W', 'U', 'B', 'G'] },
  sol: { commanders: 'Karn', colorIdentity: [] },
};

const games: RecordGame[] = [
  g(
    'g1',
    'e1',
    1,
    [
      ['ana', 'win', 'omnath'],
      ['bia', 'loss', 'atraxa'],
    ],
    { winningTurn: 9, durationMinutes: 70 },
  ),
  g(
    'g2',
    'e1',
    1,
    [
      ['ana', 'win', 'omnath'],
      ['bia', 'loss', 'atraxa'],
    ],
    { winningTurn: 5, durationMinutes: 40 },
  ),
  g(
    'g3',
    'e1',
    1,
    [
      ['ana', 'win', 'omnath'],
      ['caio', 'loss', 'sol'],
    ],
    { durationMinutes: 150 },
  ),
  g(
    'g4',
    'e2',
    8,
    [
      ['ana', 'loss', 'omnath'],
      ['bia', 'win', 'atraxa'],
    ],
    { winningTurn: 5 },
  ),
  g('g5', 'e2', 8, [
    ['bia', 'draw', 'atraxa'],
    ['caio', 'draw', 'sol'],
  ]),
];

describe('recordes do grupo', () => {
  it('vitória mais rápida, partida mais longa, sequência, noite cheia e comandante', () => {
    const r = groupRecords(games, decks);
    // Turno 5 duas vezes: vale a primeira.
    expect(r.fastestWin).toMatchObject({
      gameId: 'g2',
      eventId: 'e1',
      turn: 5,
      winnerIds: ['ana'],
    });
    expect(r.longestGame).toMatchObject({ gameId: 'g3', minutes: 150 });
    expect(r.longestStreak).toMatchObject({ userId: 'ana', length: 3, eventId: 'e1' });
    expect(r.busiestNight).toMatchObject({ eventId: 'e1', games: 3 });
    expect(r.topCommander).toEqual({ name: 'Omnath, Locus of Mana', wins: 3 });
  });

  it('sem partidas, sem recordes', () => {
    expect(groupRecords([], decks)).toEqual({
      fastestWin: null,
      longestGame: null,
      longestStreak: null,
      busiestNight: null,
      topCommander: null,
    });
  });
});

describe('cara do grupo', () => {
  it('cores dos decks jogados, comandantes diferentes e o meta do período', () => {
    const face = groupFace(games, decks, { since: at(5) });
    // Cada deck em cada partida conta suas cores; sem cor = incolor (C).
    expect(face.colors).toEqual({ W: 4, U: 4, B: 4, R: 0, G: 8, C: 2 });
    expect(face.commanders).toBe(3);
    // Meta desde o dia 5: só g4 e g5.
    expect(face.meta).toEqual([
      { name: 'Atraxa, Praetors’ Voice', games: 2 },
      { name: 'Karn', games: 1 },
      { name: 'Omnath, Locus of Mana', games: 1 },
    ]);
  });
});
