import { describe, expect, it } from 'vitest';
import {
  artCropUrl,
  DEFAULT_GROUP_SETTINGS,
  formatRules,
  validateGame,
  validateGroupSettings,
  type GamePlayerInput,
} from '.';

const ffa = (results: GamePlayerInput['result'][]): GamePlayerInput[] =>
  results.map((result, i) => ({ userId: `p${i + 1}`, result }));

const expectCode = (fn: () => void, message: RegExp) =>
  expect(fn).toThrowError(
    expect.objectContaining({ code: 'invalid_input', message: expect.stringMatching(message) }),
  );

describe('validateGame', () => {
  it('commander: todos contra todos, um vencedor ou empate', () => {
    expect(() =>
      validateGame({ format: 'commander', players: ffa(['win', 'loss', 'loss', 'loss']) }),
    ).not.toThrow();
    expect(() =>
      validateGame({ format: 'commander', players: ffa(['draw', 'draw', 'loss']) }),
    ).not.toThrow();
    expectCode(
      () => validateGame({ format: 'commander', players: ffa(['win', 'win', 'loss']) }),
      /um vencedor/,
    );
    expectCode(() => validateGame({ format: 'commander', players: ffa(['win']) }), /de 2 a 8/);
  });

  it('formatos de duelo têm exatamente 2 jogadores', () => {
    expect(() => validateGame({ format: 'standard', players: ffa(['win', 'loss']) })).not.toThrow();
    expect(() => validateGame({ format: 'draft', players: ffa(['draw', 'draw']) })).not.toThrow();
    expectCode(
      () => validateGame({ format: 'modern', players: ffa(['win', 'loss', 'loss']) }),
      /tem 2 jogadores/,
    );
  });

  it('two-headed giant: dois times de dois; vence o time inteiro', () => {
    const team = (t1: GamePlayerInput['result'], t2: GamePlayerInput['result']) => [
      { userId: 'a', team: 1, result: t1 },
      { userId: 'b', team: 1, result: t1 },
      { userId: 'c', team: 2, result: t2 },
      { userId: 'd', team: 2, result: t2 },
    ];
    expect(() =>
      validateGame({ format: 'two_headed_giant', players: team('win', 'loss') }),
    ).not.toThrow();
    expect(() =>
      validateGame({ format: 'two_headed_giant', players: team('draw', 'draw') }),
    ).not.toThrow();
    expectCode(
      () => validateGame({ format: 'two_headed_giant', players: team('win', 'win') }),
      /Só um time/,
    );
    expectCode(
      () =>
        validateGame({
          format: 'two_headed_giant',
          players: [
            { userId: 'a', team: 1, result: 'win' },
            { userId: 'b', team: 1, result: 'loss' },
            { userId: 'c', team: 2, result: 'loss' },
            { userId: 'd', team: 2, result: 'loss' },
          ],
        }),
      /mesmo resultado/,
    );
    expectCode(
      () =>
        validateGame({
          format: 'two_headed_giant',
          players: [
            { userId: 'a', team: 1, result: 'win' },
            { userId: 'b', team: 1, result: 'win' },
            { userId: 'c', team: 1, result: 'loss' },
            { userId: 'd', team: 2, result: 'loss' },
          ],
        }),
      /2 jogadores/,
    );
    expectCode(
      () =>
        validateGame({ format: 'two_headed_giant', players: ffa(['win', 'win', 'loss', 'loss']) }),
      /time de cada jogador/,
    );
    expectCode(
      () =>
        validateGame({
          format: 'commander',
          players: [
            { userId: 'a', team: 1, result: 'win' },
            { userId: 'b', result: 'loss' },
          ],
        }),
      /não tem times/,
    );
  });

  it('valida os detalhes opcionais', () => {
    const players = ffa(['win', 'loss', 'loss', 'loss']).map((p, i) => ({
      ...p,
      eliminatedOrder: i === 0 ? null : 4 - i,
    }));
    expect(() =>
      validateGame({
        format: 'commander',
        players,
        firstPlayerId: 'p2',
        winningTurn: 9,
        durationMinutes: 80,
      }),
    ).not.toThrow();
    expectCode(() => validateGame({ format: 'commander', players, firstPlayerId: 'x' }), /começou/);
    expectCode(
      () =>
        validateGame({
          format: 'commander',
          players: players.map((p) => ({ ...p, eliminatedOrder: p.eliminatedOrder ? 1 : null })),
        }),
      /mesma posição/,
    );
    expectCode(
      () =>
        validateGame({
          format: 'commander',
          players: players.map((p, i) => ({ ...p, eliminatedOrder: i + 1 })),
        }),
      /venceu/,
    );
    expectCode(
      () =>
        validateGame({
          format: 'commander',
          players: players.map((p, i) => (i === 1 ? { ...p, eliminatedOrder: 9 } : p)),
        }),
      /eliminação inválida/,
    );
  });
});

describe('configurações do grupo', () => {
  it('aceita o padrão e exige vitória > empate ≥ derrota', () => {
    expect(validateGroupSettings(DEFAULT_GROUP_SETTINGS)).toEqual(DEFAULT_GROUP_SETTINGS);
    expect(() => validateGroupSettings({ ...DEFAULT_GROUP_SETTINGS, pointsDraw: 3 })).toThrow(
      /vitória/,
    );
    expect(() => validateGroupSettings({ ...DEFAULT_GROUP_SETTINGS, tableSize: 12 })).toThrow(
      /inválidas/,
    );
  });
});

describe('utilidades', () => {
  it('formatRules cai em "other" para formatos desconhecidos', () => {
    expect(formatRules('two_headed_giant').structure).toBe('teams');
    expect(formatRules('xyz').structure).toBe('free_for_all');
  });

  it('artCropUrl troca o tamanho da imagem do Scryfall', () => {
    expect(artCropUrl('https://cards.scryfall.io/normal/front/a/b/abc.jpg?1')).toBe(
      'https://cards.scryfall.io/art_crop/front/a/b/abc.jpg?1',
    );
    expect(artCropUrl(null)).toBeNull();
  });
});
