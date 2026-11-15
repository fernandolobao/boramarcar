import { describe, expect, it } from 'vitest';
import { suggestTables, tableSizes, type PairCount } from './tables';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const pair = (a: string, b: string, recent: number, older = 0): PairCount => ({
  a,
  b,
  recent,
  older,
});
const tableOf = (tables: { playerIds: string[] }[], id: string) =>
  tables.findIndex((t) => t.playerIds.includes(id));

describe('tableSizes', () => {
  it('divide em mesas de 3 a 5, perto de 4 e o mais iguais possível', () => {
    expect(tableSizes(6)).toEqual([3, 3]);
    expect(tableSizes(7)).toEqual([4, 3]);
    expect(tableSizes(8)).toEqual([4, 4]);
    expect(tableSizes(9)).toEqual([5, 4]);
    expect(tableSizes(10)).toEqual([4, 3, 3]);
    expect(tableSizes(12)).toEqual([4, 4, 4]);
    expect(tableSizes(5)).toEqual([]);
  });

  it('respeita os limites do formato', () => {
    expect(tableSizes(8, { min: 3, max: 3, preferred: 3 })).toEqual([]);
    expect(tableSizes(9, { min: 3, max: 3, preferred: 3 })).toEqual([3, 3, 3]);
  });
});

describe('suggestTables', () => {
  it('não sugere com menos de 6 jogadores', () => {
    expect(suggestTables(ids(5), [], { seed: 1 })).toBeNull();
  });

  it('separa as duplas que mais jogaram juntas', () => {
    const pairs = [pair('p1', 'p2', 5), pair('p3', 'p4', 4)];
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = suggestTables(ids(8), pairs, { seed })!;
      expect(tableOf(result.tables, 'p1')).not.toBe(tableOf(result.tables, 'p2'));
      expect(tableOf(result.tables, 'p3')).not.toBe(tableOf(result.tables, 'p4'));
      expect(result.cost).toBe(0);
    }
  });

  it('é determinística para a mesma semente e põe cada pessoa uma vez', () => {
    const pairs = [pair('p1', 'p2', 1, 3), pair('p5', 'p6', 0, 2)];
    const a = suggestTables(ids(10), pairs, { seed: 7 })!;
    expect(suggestTables(ids(10), pairs, { seed: 7 })).toEqual(a);
    expect(a.tables.flatMap((t) => t.playerIds).sort()).toEqual(ids(10).sort());
    expect(a.tables.map((t) => t.playerIds.length)).toEqual([4, 3, 3]);
  });

  it('conta as duplas da mesa que nunca jogaram juntas', () => {
    const result = suggestTables(ids(8), [], { seed: 1 })!;
    expect(result.tables.map((t) => t.newPairs)).toEqual([6, 6]);
  });

  it('partida recente pesa mais que antiga', () => {
    // p2 e p3 ficam em mesas diferentes (9 partidas); p1 vai para a mesa de um dos dois:
    // com p2 custa 3 (1 recente) e com p3 custa 2 (2 antigas).
    const pairs = [pair('p1', 'p2', 1), pair('p1', 'p3', 0, 2), pair('p2', 'p3', 0, 9)];
    const result = suggestTables(ids(6), pairs, { seed: 3 })!;
    expect(tableOf(result.tables, 'p1')).not.toBe(tableOf(result.tables, 'p2'));
  });
});
