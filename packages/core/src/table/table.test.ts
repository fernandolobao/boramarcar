import { describe, expect, it } from 'vitest';
import {
  tableRows,
  alivePlayers,
  createTable,
  defeatReason,
  rollDie,
  startingLifeFor,
  tableDurationMinutes,
  tableGamePlayers,
  tableReducer,
  tableResult,
  tableSupportsFormat,
  type TableAction,
  type TableState,
} from './index';

const players = [
  { userId: 'a', name: 'Ana', deckId: 'd1' },
  { userId: 'b', name: 'Bia' },
  { userId: 'c', name: 'Caio' },
  { userId: 'd', name: 'Dani' },
];
const run = (state: TableState, ...actions: TableAction[]) => actions.reduce(tableReducer, state);

describe('modo mesa', () => {
  it('vida inicial e formatos', () => {
    expect(startingLifeFor('commander')).toBe(40);
    expect(startingLifeFor('modern')).toBe(20);
    expect(tableSupportsFormat('commander')).toBe(true);
    expect(tableSupportsFormat('two_headed_giant')).toBe(false);
    const t = createTable({ format: 'commander', players, now: new Date('2026-11-07T22:00:00Z') });
    expect(t.players.map((p) => p.life)).toEqual([40, 40, 40, 40]);
    expect(createTable({ format: 'commander', players, startingLife: 30 }).players[0]!.life).toBe(
      30,
    );
  });

  it('vida, dano de comandante (tira vida), veneno, monarca e desfazer', () => {
    let t = createTable({ format: 'commander', players });
    t = run(
      t,
      { type: 'life', userId: 'a', delta: -5 },
      { type: 'commander', userId: 'a', fromUserId: 'b', delta: 7 },
      { type: 'counter', userId: 'c', counter: 'poison', delta: 3 },
      { type: 'counter', userId: 'c', counter: 'poison', delta: -10 },
      { type: 'monarch', userId: 'd' },
    );
    expect(t.players[0]).toMatchObject({ life: 28, commanderDamage: { b: 7 } });
    expect(t.players[2]!.counters.poison).toBe(0);
    expect(t.monarchId).toBe('d');
    t = run(t, { type: 'undo' }, { type: 'undo' }, { type: 'undo' });
    expect(t.monarchId).toBeNull();
    expect(t.players[2]!.counters.poison).toBe(0);
    t = run(t, { type: 'undo' });
    expect(t.players[0]).toMatchObject({ life: 35, commanderDamage: {} });
    expect(run(createTable({ format: 'commander', players }), { type: 'undo' }).step).toBe(0);
  });

  it('derrotas: vida, 10 de veneno, 21 de comandante (só em formatos com comandante) e concessão', () => {
    let t = createTable({ format: 'commander', players });
    t = run(
      t,
      { type: 'commander', userId: 'b', fromUserId: 'a', delta: 21 }, // passo 1
      { type: 'counter', userId: 'c', counter: 'poison', delta: 10 }, // passo 2
      { type: 'concede', userId: 'd', conceded: true }, // passo 3
    );
    expect(t.players.map((p) => defeatReason(p, t.format))).toEqual([
      null,
      'commander',
      'poison',
      'conceded',
    ]);
    expect(tableResult(t)).toEqual({
      winnerId: 'a',
      eliminated: [
        { userId: 'b', order: 1 },
        { userId: 'c', order: 2 },
        { userId: 'd', order: 3 },
      ],
    });
    expect(tableGamePlayers(t, 'a')).toEqual([
      { userId: 'a', deckId: 'd1', seat: 1, result: 'win', eliminatedOrder: null },
      { userId: 'b', deckId: null, seat: 2, result: 'loss', eliminatedOrder: 1 },
      { userId: 'c', deckId: null, seat: 3, result: 'loss', eliminatedOrder: 2 },
      { userId: 'd', deckId: null, seat: 4, result: 'loss', eliminatedOrder: 3 },
    ]);
    // Voltou à vida (desconcedeu): sai da ordem.
    t = run(t, { type: 'concede', userId: 'd', conceded: false });
    expect(alivePlayers(t).map((p) => p.userId)).toEqual(['a', 'd']);
    expect(tableResult(t).winnerId).toBeNull();
    expect(tableGamePlayers(t, null).every((p) => p.result === 'draw')).toBe(true);

    const modern = run(
      createTable({ format: 'modern', players: players.slice(0, 2), startingLife: 40 }),
      {
        type: 'commander',
        userId: 'b',
        fromUserId: 'a',
        delta: 21,
      },
    );
    expect(defeatReason(modern.players[1]!, 'modern')).toBe(null);
    const dead = run(createTable({ format: 'modern', players: players.slice(0, 2) }), {
      type: 'life',
      userId: 'b',
      delta: -20,
    });
    expect(tableResult(dead).winnerId).toBe('a');
  });

  it('duração, dados e quem começa', () => {
    const t = createTable({ format: 'commander', players, now: new Date('2026-11-07T22:00:00Z') });
    expect(tableDurationMinutes(t, new Date('2026-11-07T23:35:20Z'))).toBe(95);
    expect(tableDurationMinutes(t, new Date('2026-11-07T22:00:05Z'))).toBe(1);
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999)).toBe(20);
    expect(run(t, { type: 'first', userId: 'c' }).firstPlayerId).toBe('c');
  });
});

describe('disposição em linhas (app)', () => {
  it('segue a mesma grade do site, em sentido horário', () => {
    expect(tableRows(2)).toEqual([[0], [1]]);
    expect(tableRows(3)).toEqual([[0, 1], [2]]);
    expect(tableRows(4)).toEqual([
      [0, 1],
      [3, 2],
    ]);
    expect(tableRows(5)).toEqual([[0, 1], [4, 2], [3]]);
    expect(tableRows(6)).toEqual([
      [0, 1],
      [5, 2],
      [4, 3],
    ]);
  });
});
