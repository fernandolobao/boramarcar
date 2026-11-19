import { describe, expect, it } from 'vitest';
import {
  pairRound,
  podSizes,
  recommendedRounds,
  standings,
  tableModeEligible,
  tableOutcome,
  tournamentShape,
  type PlayedRound,
} from './index';

/** Gerador previsível para os sorteios. */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('mesa por formato', () => {
  it('pods nos multijogador, pares no um contra um (melhor de 3) e duplas no 2HG', () => {
    expect(tournamentShape('commander')).toEqual({ table: 'pod', entrantSize: 1, bestOf: 1 });
    expect(tournamentShape('other')).toEqual({ table: 'pod', entrantSize: 1, bestOf: 1 });
    expect(tournamentShape('modern')).toEqual({ table: 'pair', entrantSize: 1, bestOf: 3 });
    expect(tournamentShape('draft')).toEqual({ table: 'pair', entrantSize: 1, bestOf: 3 });
    expect(tournamentShape('two_headed_giant')).toEqual({
      table: 'pair',
      entrantSize: 2,
      bestOf: 3,
    });
  });
});

describe('tamanho dos pods', () => {
  it('o máximo de pods de 4, completando com pods de 3', () => {
    expect(podSizes(4)).toEqual([4]);
    expect(podSizes(6)).toEqual([3, 3]);
    expect(podSizes(7)).toEqual([4, 3]);
    expect(podSizes(9)).toEqual([3, 3, 3]);
    expect(podSizes(13)).toEqual([4, 3, 3, 3]);
    expect(podSizes(22)).toEqual([4, 4, 4, 4, 3, 3]);
  });

  it('casos pequenos: 5 vira um pod de 5; 3 ou menos, um pod só', () => {
    expect(podSizes(5)).toEqual([5]);
    expect(podSizes(3)).toEqual([3]);
    expect(podSizes(2)).toEqual([2]);
  });

  it('a soma sempre fecha com todos os inscritos', () => {
    for (let n = 1; n <= 64; n++) expect(podSizes(n).reduce((a, b) => a + b, 0)).toBe(n);
  });
});

describe('número de rodadas recomendado', () => {
  it('no mínimo 3; cresce com o número de inscritos', () => {
    expect(recommendedRounds(4, 'pair')).toBe(3);
    expect(recommendedRounds(9, 'pair')).toBe(4);
    expect(recommendedRounds(33, 'pair')).toBe(6);
    expect(recommendedRounds(16, 'pod')).toBe(3);
    expect(recommendedRounds(40, 'pod')).toBe(4);
  });
});

describe('resultado da mesa', () => {
  it('par: quem venceu mais jogos vence a rodada; jogos iguais = empate', () => {
    expect(tableOutcome({ entrants: ['a', 'b'], gameWins: { a: 2, b: 1 }, gameDraws: 0 })).toEqual({
      a: 'win',
      b: 'loss',
    });
    expect(tableOutcome({ entrants: ['a', 'b'], gameWins: { a: 1, b: 1 }, gameDraws: 1 })).toEqual({
      a: 'draw',
      b: 'draw',
    });
  });

  it('pod: um vencedor e o resto perde; ninguém venceu = empate para todos', () => {
    expect(tableOutcome({ entrants: ['a', 'b', 'c'], gameWins: { b: 1 }, gameDraws: 0 })).toEqual({
      a: 'loss',
      b: 'win',
      c: 'loss',
    });
    expect(tableOutcome({ entrants: ['a', 'b', 'c'], gameWins: {}, gameDraws: 1 })).toEqual({
      a: 'draw',
      b: 'draw',
      c: 'draw',
    });
  });

  it('mesa de um só é o bye: vitória', () => {
    expect(tableOutcome({ entrants: ['a'], gameWins: {}, gameDraws: 0 })).toEqual({ a: 'bye' });
  });
});

describe('emparelhamento suíço', () => {
  it('1ª rodada: pares sorteados, todos jogam; ímpar: um bye', () => {
    const round = pairRound(ids(5), [], { table: 'pair', random: seeded() });
    expect(round.map((t) => t.length).sort()).toEqual([1, 2, 2]);
    expect(round.flat().sort()).toEqual(ids(5));
  });

  it('pods: mesas no tamanho certo, todos jogam', () => {
    const round = pairRound(ids(13), [], { table: 'pod', random: seeded(7) });
    expect(round.map((t) => t.length)).toEqual([4, 3, 3, 3]);
    expect(round.flat().sort()).toEqual(ids(13).sort());
  });

  it('rodadas seguintes: juntam pontos parecidos e evitam repetir adversário', () => {
    const r1: PlayedRound = {
      tables: [
        { entrants: ['p1', 'p2'], gameWins: { p1: 2 }, gameDraws: 0 },
        { entrants: ['p3', 'p4'], gameWins: { p3: 2 }, gameDraws: 0 },
      ],
    };
    const round = pairRound(ids(4), [r1], { table: 'pair', random: seeded() });
    // Os vencedores (p1, p3) se enfrentam; os perdedores (p2, p4) também. Ninguém repete.
    expect(round.map((t) => [...t].sort())).toEqual(
      expect.arrayContaining([
        ['p1', 'p3'],
        ['p2', 'p4'],
      ]),
    );
  });

  it('o bye vai para quem ainda não teve, entre os de menos pontos', () => {
    const r1: PlayedRound = {
      tables: [
        { entrants: ['p1', 'p2'], gameWins: { p1: 2 }, gameDraws: 0 },
        { entrants: ['p3'], gameWins: {}, gameDraws: 0 },
      ],
    };
    const round = pairRound(ids(3), [r1], { table: 'pair', random: seeded() });
    const bye = round.find((t) => t.length === 1)!;
    expect(bye).toEqual(['p2']);
  });

  it('pods: depois de 3 rodadas com 8 inscritos, repetições ficam no mínimo possível', () => {
    const played: PlayedRound[] = [];
    const random = seeded(3);
    for (let r = 0; r < 3; r++) {
      const tables = pairRound(ids(8), played, { table: 'pod', random });
      played.push({
        tables: tables.map((t) => ({ entrants: t, gameWins: { [t[0]!]: 1 }, gameDraws: 0 })),
      });
    }
    // Cada pessoa encontra 3 adversários por rodada; com 7 possíveis, alguma repetição é inevitável,
    // mas ninguém joga as 3 rodadas com o mesmo pod inteiro.
    const pods = played.flatMap((r) => r.tables.map((t) => [...t.entrants].sort().join()));
    expect(new Set(pods).size).toBe(pods.length);
  });
});

describe('classificação com desempates do MTR', () => {
  it('pontos, depois OMW%, GW% e OGW% (piso de 33%, bye fora das contas dos oponentes)', () => {
    const rounds: PlayedRound[] = [
      {
        tables: [
          { entrants: ['a', 'b'], gameWins: { a: 2, b: 0 }, gameDraws: 0 },
          { entrants: ['c', 'd'], gameWins: { c: 2, d: 1 }, gameDraws: 0 },
          { entrants: ['e'], gameWins: {}, gameDraws: 0 },
        ],
      },
      {
        tables: [
          { entrants: ['a', 'c'], gameWins: { a: 2, c: 1 }, gameDraws: 0 },
          { entrants: ['e', 'b'], gameWins: { e: 2, b: 0 }, gameDraws: 0 },
          { entrants: ['d'], gameWins: {}, gameDraws: 0 },
        ],
      },
    ];
    const table = standings(['a', 'b', 'c', 'd', 'e'], rounds, { win: 3, draw: 1, loss: 0 });
    expect(table.map((s) => s.entrant)).toEqual(['a', 'e', 'c', 'd', 'b']);
    const a = table[0]!;
    expect(a).toMatchObject({ points: 6, wins: 2, losses: 0, draws: 0, byes: 0, rank: 1 });
    // Oponentes de a: b (0 pontos → piso 0,33) e c (3 de 6 → 0,5): média 0,4167.
    expect(a.omw).toBeCloseTo((0.33 + 0.5) / 2, 4);
    // e: bye + vitória sobre b. Só b conta como oponente.
    expect(table[1]).toMatchObject({ entrant: 'e', points: 6, byes: 1 });
    expect(table[1]!.omw).toBeCloseTo(0.33, 4);
    // Jogos de a: 4 vencidos em 5 → 12/15.
    expect(a.gw).toBeCloseTo(12 / 15, 4);
  });

  it('pontuação configurável muda os pontos, não os desempates', () => {
    const rounds: PlayedRound[] = [
      { tables: [{ entrants: ['a', 'b', 'c', 'd'], gameWins: { b: 1 }, gameDraws: 0 }] },
    ];
    const table = standings(['a', 'b', 'c', 'd'], rounds, { win: 5, draw: 2, loss: 1 });
    expect(table[0]).toMatchObject({ entrant: 'b', points: 5, rank: 1 });
    // Os outros três empatam em tudo: mesma posição.
    expect(table.slice(1).map((s) => s.rank)).toEqual([2, 2, 2]);
    expect(table[1]!.points).toBe(1);
  });
});

describe('mesa do torneio no modo mesa', () => {
  const running = {
    status: 'running',
    entrantSize: 1,
    bestOf: 1,
    table: 'pod' as const,
    format: 'commander',
  };
  const open = { reported: false, entrants: ['a', 'b', 'c', 'd'] };
  it('pod ou par em melhor de 1, sem resultado, de inscrições individuais', () => {
    expect(tableModeEligible(running, open)).toBe(true);
    expect(
      tableModeEligible(
        { ...running, table: 'pair', format: 'modern' },
        { reported: false, entrants: ['a', 'b'] },
      ),
    ).toBe(true);
  });
  it('fora: melhor de 3, duplas (2HG), mesa já registrada, bye e torneio parado', () => {
    expect(
      tableModeEligible({ ...running, table: 'pair', bestOf: 3, format: 'modern' }, open),
    ).toBe(false);
    expect(
      tableModeEligible(
        { ...running, table: 'pair', entrantSize: 2, format: 'two_headed_giant' },
        open,
      ),
    ).toBe(false);
    expect(tableModeEligible(running, { ...open, reported: true })).toBe(false);
    expect(tableModeEligible(running, { reported: false, entrants: ['a'] })).toBe(false);
    expect(tableModeEligible({ ...running, status: 'finished' }, open)).toBe(false);
  });
});
