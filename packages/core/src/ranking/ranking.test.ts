import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { computeStandings, validateGameResult, type GameRecord } from './index';

const game = (id: string, winner: string | null, ...others: string[]): GameRecord => ({
  gameId: id,
  players: [
    ...(winner ? [{ userId: winner, result: 'win' as const }] : []),
    ...others.map((userId) => ({ userId, result: winner ? ('loss' as const) : ('draw' as const) })),
  ],
});

describe('validateGameResult', () => {
  it('aceita um vencedor e o resto derrotas', () => {
    expect(() => validateGameResult(game('g', 'a', 'b', 'c', 'd').players)).not.toThrow();
  });

  it('aceita empate geral', () => {
    expect(() => validateGameResult(game('g', null, 'a', 'b', 'c', 'd').players)).not.toThrow();
  });

  it.each([
    ['menos de 2 jogadores', [{ userId: 'a', result: 'win' as const }]],
    [
      'dois vencedores',
      [
        { userId: 'a', result: 'win' as const },
        { userId: 'b', result: 'win' as const },
      ],
    ],
    [
      'vencedor e empate',
      [
        { userId: 'a', result: 'win' as const },
        { userId: 'b', result: 'draw' as const },
      ],
    ],
    [
      'só derrotas',
      [
        { userId: 'a', result: 'loss' as const },
        { userId: 'b', result: 'loss' as const },
      ],
    ],
    [
      'jogador repetido',
      [
        { userId: 'a', result: 'win' as const },
        { userId: 'a', result: 'loss' as const },
      ],
    ],
  ])('rejeita %s', (_label, players) => {
    expect(() => validateGameResult(players)).toThrow(DomainError);
  });
});

describe('computeStandings', () => {
  it('retorna vazio sem partidas', () => {
    expect(computeStandings([])).toEqual([]);
  });

  it('soma vitórias, derrotas, empates e pontos', () => {
    const standings = computeStandings([
      game('1', 'ana', 'bia', 'caio', 'duda'),
      game('2', 'ana', 'bia', 'caio', 'duda'),
      game('3', 'bia', 'ana', 'caio', 'duda'),
      game('4', null, 'ana', 'bia', 'caio', 'duda'),
    ]);
    const ana = standings.find((s) => s.userId === 'ana');
    expect(ana).toMatchObject({ games: 4, wins: 2, losses: 1, draws: 1, points: 7, position: 1 });
    expect(ana?.winRate).toBeCloseTo(0.5);
    expect(standings.map((s) => s.userId)).toEqual(['ana', 'bia', 'caio', 'duda']);
    expect(standings[2]?.position).toBe(3);
    expect(standings[3]?.position).toBe(3);
  });

  it('aceita tabela de pontos customizada', () => {
    const standings = computeStandings([game('1', 'a', 'b')], { win: 1, draw: 0, loss: -1 });
    expect(standings.map((s) => s.points)).toEqual([1, -1]);
  });

  it('desempata por % de vitórias e menos jogos', () => {
    const standings = computeStandings([
      game('1', 'a', 'x'),
      game('2', 'b', 'x'),
      game('3', 'b', 'x'),
      game('4', 'a', 'x'),
      game('5', 'x', 'b'),
    ]);
    // a: 2V em 2J; b: 2V em 3J
    expect(standings.slice(0, 2).map((s) => s.userId)).toEqual(['a', 'b']);
  });
});
