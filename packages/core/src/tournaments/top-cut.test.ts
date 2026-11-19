import { describe, expect, it } from 'vitest';
import { planTopCut, topCutOptions, topCutStageName, type TableResult } from './index';

const seeds = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`);
/** Mesa com vencedor. */
const won = (entrants: string[], winner: string, wins = 1): TableResult => ({
  entrants,
  gameWins: { [winner]: wins },
  gameDraws: 0,
});

describe('top cut', () => {
  it('opções por tipo de mesa, só as que cabem no número de inscritos', () => {
    expect(topCutOptions('pair', 20)).toEqual([4, 8]);
    expect(topCutOptions('pair', 6)).toEqual([4]);
    expect(topCutOptions('pod', 20)).toEqual([4, 10, 16]);
    expect(topCutOptions('pod', 4)).toEqual([]);
  });

  it('um contra um, top 8: chave clássica, vencedores seguem em ordem até a final', () => {
    const s = seeds(8);
    const first = planTopCut({ table: 'pair', size: 8, seeds: s, played: [] });
    expect(first).toEqual({
      next: [
        ['s1', 's8'],
        ['s4', 's5'],
        ['s2', 's7'],
        ['s3', 's6'],
      ],
    });
    const quarters = [
      won(['s1', 's8'], 's1', 2),
      won(['s4', 's5'], 's5', 2),
      won(['s2', 's7'], 's7', 2),
      won(['s3', 's6'], 's3', 2),
    ];
    expect(planTopCut({ table: 'pair', size: 8, seeds: s, played: [quarters] })).toEqual({
      next: [
        ['s1', 's5'],
        ['s7', 's3'],
      ],
    });
    const semis = [won(['s1', 's5'], 's5', 2), won(['s7', 's3'], 's3', 2)];
    expect(planTopCut({ table: 'pair', size: 8, seeds: s, played: [quarters, semis] })).toEqual({
      next: [['s5', 's3']],
    });
    const final = [won(['s5', 's3'], 's3', 2)];
    expect(
      planTopCut({ table: 'pair', size: 8, seeds: s, played: [quarters, semis, final] }),
    ).toEqual({ champion: 's3' });
  });

  it('pods: top 4 é a final direta; top 16 mistura as cabeças de chave em 4 pods', () => {
    expect(planTopCut({ table: 'pod', size: 4, seeds: seeds(4), played: [] })).toEqual({
      next: [['s1', 's2', 's3', 's4']],
    });
    expect(planTopCut({ table: 'pod', size: 16, seeds: seeds(16), played: [] })).toEqual({
      next: [
        ['s1', 's8', 's9', 's16'],
        ['s2', 's7', 's10', 's15'],
        ['s3', 's6', 's11', 's14'],
        ['s4', 's5', 's12', 's13'],
      ],
    });
  });

  it('pods, top 10: os dois primeiros esperam na final; empate no pod leva a melhor cabeça de chave', () => {
    const s = seeds(10);
    expect(planTopCut({ table: 'pod', size: 10, seeds: s, played: [] })).toEqual({
      next: [
        ['s3', 's6', 's7', 's10'],
        ['s4', 's5', 's8', 's9'],
      ],
    });
    const semis: TableResult[] = [
      won(['s3', 's6', 's7', 's10'], 's10'),
      { entrants: ['s4', 's5', 's8', 's9'], gameWins: {}, gameDraws: 1 },
    ];
    expect(planTopCut({ table: 'pod', size: 10, seeds: s, played: [semis] })).toEqual({
      next: [['s1', 's2', 's4', 's10']],
    });
  });

  it('nome da fase pela quantidade de mesas que ainda faltam', () => {
    expect(topCutStageName({ table: 'pair', size: 8, index: 0 })).toBe('quarterfinal');
    expect(topCutStageName({ table: 'pair', size: 8, index: 1 })).toBe('semifinal');
    expect(topCutStageName({ table: 'pair', size: 8, index: 2 })).toBe('final');
    expect(topCutStageName({ table: 'pair', size: 4, index: 0 })).toBe('semifinal');
    expect(topCutStageName({ table: 'pod', size: 16, index: 0 })).toBe('semifinal');
    expect(topCutStageName({ table: 'pod', size: 4, index: 0 })).toBe('final');
  });
});
