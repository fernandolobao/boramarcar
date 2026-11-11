import { describe, expect, it } from 'vitest';
import { buildSimpleGame, parseOptionalInt, type SimpleGameForm } from '.';

const base: SimpleGameForm = {
  format: 'commander',
  playerIds: ['a', 'b', 'c', 'd'],
  decks: { a: 'deck-a', c: null },
  winner: 'b',
};

describe('parseOptionalInt', () => {
  it('vazio é null; só dígitos viram número; o resto é NaN', () => {
    expect(parseOptionalInt('')).toBeNull();
    expect(parseOptionalInt('  ')).toBeNull();
    expect(parseOptionalInt(undefined)).toBeNull();
    expect(parseOptionalInt(' 12 ')).toBe(12);
    expect(parseOptionalInt('1.5')).toBeNaN();
    expect(parseOptionalInt('-3')).toBeNaN();
    expect(parseOptionalInt('dez')).toBeNaN();
  });
});

describe('buildSimpleGame', () => {
  it('monta jogadores na ordem da mesa, com deck e resultado', () => {
    const result = buildSimpleGame({
      ...base,
      firstPlayerId: 'c',
      winningTurn: '9',
      durationMinutes: ' 75 ',
      notes: '  Mesa boa  ',
    });
    expect(result).toEqual({
      ok: true,
      game: {
        format: 'commander',
        firstPlayerId: 'c',
        winningTurn: 9,
        durationMinutes: 75,
        notes: 'Mesa boa',
        players: [
          { userId: 'a', deckId: 'deck-a', seat: 1, result: 'loss' },
          { userId: 'b', deckId: null, seat: 2, result: 'win' },
          { userId: 'c', deckId: null, seat: 3, result: 'loss' },
          { userId: 'd', deckId: null, seat: 4, result: 'loss' },
        ],
      },
    });
  });

  it('empate marca todos com draw; detalhes vazios viram null', () => {
    const result = buildSimpleGame({ ...base, winner: 'draw', notes: '   ' });
    expect(result.ok && result.game.players.every((p) => p.result === 'draw')).toBe(true);
    expect(result.ok && result.game).toMatchObject({
      firstPlayerId: null,
      winningTurn: null,
      durationMinutes: null,
      notes: null,
    });
  });

  it('respeita o número de jogadores do formato', () => {
    expect(buildSimpleGame({ ...base, playerIds: ['a'], winner: 'a' })).toEqual({
      ok: false,
      error: { code: 'players', min: 2, max: 8 },
    });
    expect(buildSimpleGame({ ...base, format: 'modern' })).toEqual({
      ok: false,
      error: { code: 'players', min: 2, max: 2 },
    });
    expect(buildSimpleGame({ ...base, format: 'modern', playerIds: ['a', 'b'] }).ok).toBe(true);
  });

  it('jogador repetido conta uma vez', () => {
    const result = buildSimpleGame({ ...base, playerIds: ['a', 'a', 'b'], winner: 'a' });
    expect(result.ok && result.game.players.map((p) => p.userId)).toEqual(['a', 'b']);
  });

  it('exige resultado de alguém que está na partida', () => {
    expect(buildSimpleGame({ ...base, winner: null })).toEqual({
      ok: false,
      error: { code: 'result' },
    });
    expect(buildSimpleGame({ ...base, winner: 'z' })).toEqual({
      ok: false,
      error: { code: 'result' },
    });
  });

  it('valida turno (1–99) e duração (1–1440 min)', () => {
    for (const winningTurn of ['0', '100', 'abc', '2.5']) {
      expect(buildSimpleGame({ ...base, winningTurn })).toEqual({
        ok: false,
        error: { code: 'turn' },
      });
    }
    for (const durationMinutes of ['0', '1441', '-1']) {
      expect(buildSimpleGame({ ...base, durationMinutes })).toEqual({
        ok: false,
        error: { code: 'duration' },
      });
    }
    expect(buildSimpleGame({ ...base, winningTurn: '99', durationMinutes: '1440' }).ok).toBe(true);
  });

  it('quem começou fora da partida é ignorado', () => {
    const result = buildSimpleGame({ ...base, firstPlayerId: 'z' });
    expect(result.ok && result.game.firstPlayerId).toBeNull();
  });

  it('partidas em times ficam para o site', () => {
    expect(buildSimpleGame({ ...base, format: 'two_headed_giant' })).toEqual({
      ok: false,
      error: { code: 'teams' },
    });
  });

  it('corta observações em 500 caracteres', () => {
    const result = buildSimpleGame({ ...base, notes: 'x'.repeat(600) });
    expect(result.ok && result.game.notes).toHaveLength(500);
  });
});
