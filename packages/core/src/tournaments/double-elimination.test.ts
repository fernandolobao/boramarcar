import { describe, expect, it } from 'vitest';
import { planDoubleElimination, structureOptions, type BracketTable } from './index';

/** Mesa jogada: vence o primeiro listado em `winner`. */
const t = (
  bracket: BracketTable['bracket'],
  entrants: string[],
  winner?: string,
): BracketTable => ({
  bracket,
  entrants,
  gameWins: winner ? { [winner]: 2 } : {},
  gameDraws: 0,
});
const tables = (plan: ReturnType<typeof planDoubleElimination>) =>
  'next' in plan ? plan.next.map((x) => `${x.bracket}:${x.entrants.join('-')}`) : plan;

describe('eliminação dupla (9.4)', () => {
  it('existe só para mesas de par', () => {
    expect(structureOptions('pair')).toContain('double_elimination');
    expect(structureOptions('pod')).not.toContain('double_elimination');
  });

  it('4 inscritos: vencedores, perdedores e a grande final sem reset', () => {
    const seeds = ['s1', 's2', 's3', 's4'];
    const r1 = [t('winners', ['s1', 's4'], 's1'), t('winners', ['s2', 's3'], 's2')];
    expect(tables(planDoubleElimination({ seeds, played: [] }))).toEqual([
      'winners:s1-s4',
      'winners:s2-s3',
    ]);
    const plan2 = planDoubleElimination({ seeds, played: [r1] });
    // Quem perdeu na 1ª rodada cai para a chave dos perdedores na mesma rodada em que a chave
    // dos vencedores segue.
    expect(tables(plan2)).toEqual(['winners:s1-s2', 'losers:s3-s4']);
    const r2 = [t('winners', ['s1', 's2'], 's1'), t('losers', ['s3', 's4'], 's3')];
    // s4 saiu (duas derrotas). s2 cai; quem perdeu há mais tempo (s3) joga primeiro.
    expect(tables(planDoubleElimination({ seeds, played: [r1, r2] }))).toEqual(['losers:s3-s2']);
    const r3 = [t('losers', ['s3', 's2'], 's2')];
    expect(tables(planDoubleElimination({ seeds, played: [r1, r2, r3] }))).toEqual(['final:s1-s2']);
    // Sem reset: quem veio da chave dos perdedores e vence a final é campeão.
    const r4 = [t('final', ['s1', 's2'], 's2')];
    expect(planDoubleElimination({ seeds, played: [r1, r2, r3, r4] })).toEqual({ champion: 's2' });
  });

  it('3 inscritos: o primeiro do sorteio passa direto; a chave dos perdedores também tem bye', () => {
    const seeds = ['s1', 's2', 's3'];
    expect(tables(planDoubleElimination({ seeds, played: [] }))).toEqual([
      'winners:s1',
      'winners:s2-s3',
    ]);
    const r1 = [t('winners', ['s1']), t('winners', ['s2', 's3'], 's2')];
    expect(tables(planDoubleElimination({ seeds, played: [r1] }))).toEqual([
      'winners:s1-s2',
      'losers:s3',
    ]);
    const r2 = [t('winners', ['s1', 's2'], 's1'), t('losers', ['s3'])];
    expect(tables(planDoubleElimination({ seeds, played: [r1, r2] }))).toEqual(['losers:s3-s2']);
    const r3 = [t('losers', ['s3', 's2'], 's3')];
    expect(tables(planDoubleElimination({ seeds, played: [r1, r2, r3] }))).toEqual(['final:s1-s3']);
    const r4 = [t('final', ['s1', 's3'], 's1')];
    expect(planDoubleElimination({ seeds, played: [r1, r2, r3, r4] })).toEqual({ champion: 's1' });
  });

  it('com 6 inscritos sempre termina, ninguém joga com duas derrotas e o campeão perdeu no máximo uma', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f'];
    const played: BracketTable[][] = [];
    const losses = new Map<string, number>();
    let plan = planDoubleElimination({ seeds, played });
    let guard = 0;
    while ('next' in plan) {
      guard++;
      expect(guard).toBeLessThan(20);
      const round = plan.next.map((x) => {
        for (const e of x.entrants) expect(losses.get(e) ?? 0).toBeLessThan(2);
        if (x.entrants.length === 1) return t(x.bracket, x.entrants);
        // Vence sempre o segundo da mesa (para variar).
        const [a, b] = x.entrants as [string, string];
        losses.set(a, (losses.get(a) ?? 0) + 1);
        return t(x.bracket, x.entrants, b);
      });
      played.push(round);
      plan = planDoubleElimination({ seeds, played });
    }
    expect(losses.get(plan.champion) ?? 0).toBeLessThanOrEqual(1);
    expect([...losses.values()].filter((n) => n >= 2)).toHaveLength(seeds.length - 2);
  });
});
