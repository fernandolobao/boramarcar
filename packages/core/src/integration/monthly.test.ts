import { describe, expect, it } from 'vitest';
import { monthBounds, monthlyRecap, previousMonth } from './monthly';
import type { RecordGame } from './records';

const at = (m: number, d: number) => new Date(Date.UTC(2026, m - 1, d, 23));
const g = (
  id: string,
  eventId: string,
  when: Date,
  players: [string, 'win' | 'loss' | 'draw'][],
  extra: Partial<RecordGame> = {},
): RecordGame => ({
  gameId: id,
  eventId,
  playedAt: when,
  winningTurn: null,
  durationMinutes: null,
  players: players.map(([userId, result]) => ({ userId, result, deckId: null })),
  ...extra,
});

describe('retrospectiva do mês', () => {
  const games = [
    // Outubro
    g(
      'o1',
      'eo',
      at(10, 10),
      [
        ['ana', 'win'],
        ['bia', 'loss'],
      ],
      { winningTurn: 7 },
    ),
    // Novembro
    g(
      'n1',
      'e1',
      at(11, 5),
      [
        ['ana', 'loss'],
        ['bia', 'win'],
        ['caio', 'loss'],
      ],
      { winningTurn: 5 },
    ),
    g('n2', 'e1', at(11, 5), [
      ['bia', 'win'],
      ['caio', 'loss'],
    ]),
    g('n3', 'e2', at(11, 12), [
      ['ana', 'win'],
      ['bia', 'loss'],
    ]),
    g('n4', 'e2', at(11, 12), [
      ['bia', 'loss'],
      ['ana', 'win'],
    ]),
  ];
  const r = monthlyRecap(games, { from: at(11, 1), to: at(12, 1) }, {});

  it('partidas, noites, quem jogou e o vencedor do mês', () => {
    expect(r.games).toBe(4);
    expect(r.nights).toBe(2);
    expect(r.players.sort()).toEqual(['ana', 'bia', 'caio']);
    // Ana e Bia com 2 vitórias: vence quem jogou menos (melhor aproveitamento) — Ana (3 partidas).
    expect(r.winner).toEqual({ userId: 'ana', wins: 2, games: 3 });
  });

  it('estreias, recordes batidos no mês (só os que já existiam) e o duelo do mês', () => {
    expect(r.debuts).toEqual(['caio']);
    // Turno 5 bate o turno 7 de outubro; a noite com mais partidas (2) também é deste mês.
    expect(r.recordsBroken.sort()).toEqual(['busiestNight', 'fastestWin']);
    // Ana x Bia se enfrentaram 3 vezes no mês (mais que qualquer outra dupla).
    expect(r.duel).toEqual({ a: 'ana', b: 'bia', games: 3, aWins: 2, bWins: 1 });
  });

  it('mês sem partidas', () => {
    const empty = monthlyRecap(games, { from: at(12, 1), to: at(12, 31) }, {});
    expect(empty).toMatchObject({ games: 0, winner: null, duel: null, debuts: [] });
  });

  it('limites do mês no fuso e o mês anterior', () => {
    expect(monthBounds('2026-11', 'America/Sao_Paulo')).toEqual({
      from: new Date('2026-11-01T03:00:00Z'),
      to: new Date('2026-12-01T03:00:00Z'),
    });
    expect(monthBounds('2026-12', 'UTC')!.to).toEqual(new Date('2027-01-01T00:00:00Z'));
    expect(monthBounds('2026-13', 'UTC')).toBeNull();
    expect(monthBounds('../x', 'UTC')).toBeNull();
    // 1º de dezembro, 1h em São Paulo: o mês anterior é novembro.
    expect(previousMonth(new Date('2026-12-01T04:00:00Z'), 'America/Sao_Paulo')).toBe('2026-11');
    expect(previousMonth(new Date('2027-01-01T12:00:00Z'), 'UTC')).toBe('2026-12');
  });
});
