import { describe, expect, it } from 'vitest';
import {
  eliminationStageName,
  planKnockout,
  roundRobinSchedule,
  structureOptions,
  topCutStageName,
  type TableResult,
} from './index';

const won = (entrants: string[], winner: string): TableResult => ({
  entrants,
  gameWins: { [winner]: 2 },
  gameDraws: 0,
});

describe('estruturas de torneio (9.4)', () => {
  it('pods só no suíço; um contra um em suíço, eliminação simples ou todos contra todos', () => {
    expect(structureOptions('pod')).toEqual(['swiss']);
    expect(structureOptions('pair')).toEqual(['swiss', 'single_elimination', 'round_robin']);
  });

  it('todos contra todos: cada par uma vez; com número ímpar, um bye por rodada para cada um', () => {
    const even = roundRobinSchedule(['a', 'b', 'c', 'd']);
    expect(even).toHaveLength(3);
    const pairs = even.flat().map((t) => [...t].sort().join('-'));
    expect(new Set(pairs).size).toBe(6);
    expect(even.every((round) => round.flat().length === 4)).toBe(true);

    const odd = roundRobinSchedule(['a', 'b', 'c', 'd', 'e']);
    expect(odd).toHaveLength(5);
    const byes = odd.map((round) => round.find((t) => t.length === 1)![0]);
    expect([...byes].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    const games = odd
      .flat()
      .filter((t) => t.length === 2)
      .map((t) => [...t].sort().join('-'));
    expect(new Set(games).size).toBe(10);
  });

  it('eliminação simples: chave na ordem clássica, bye para as primeiras posições, até o campeão', () => {
    const seeds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const first = planKnockout({ seeds, played: [] });
    expect(first).toEqual({
      next: [['s1'], ['s4', 's5'], ['s2'], ['s3', 's6']],
    });
    const r1 = [
      { entrants: ['s1'], gameWins: {}, gameDraws: 0 },
      won(['s4', 's5'], 's5'),
      { entrants: ['s2'], gameWins: {}, gameDraws: 0 },
      won(['s3', 's6'], 's3'),
    ];
    expect(planKnockout({ seeds, played: [r1] })).toEqual({
      next: [
        ['s1', 's5'],
        ['s2', 's3'],
      ],
    });
    const r2 = [won(['s1', 's5'], 's5'), won(['s2', 's3'], 's2')];
    expect(planKnockout({ seeds, played: [r1, r2] })).toEqual({ next: [['s5', 's2']] });
    expect(planKnockout({ seeds, played: [r1, r2, [won(['s5', 's2'], 's2')]] })).toEqual({
      champion: 's2',
    });
  });

  it('nome da fase pela quantidade de rodadas que faltam; antes das quartas, sem nome', () => {
    expect(eliminationStageName(4, 0)).toBeNull();
    expect(eliminationStageName(4, 1)).toBe('quarterfinal');
    expect(eliminationStageName(4, 2)).toBe('semifinal');
    expect(eliminationStageName(4, 3)).toBe('final');
    // O top cut segue igual.
    expect(topCutStageName({ table: 'pair', size: 8, index: 0 })).toBe('quarterfinal');
  });
});
