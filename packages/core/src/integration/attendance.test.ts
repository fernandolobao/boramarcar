import { describe, expect, it } from 'vitest';
import { attendanceSummary } from './attendance';

const now = new Date('2026-11-15T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600_000);
// Últimos 8 encontros realizados, um por semana, o mais recente primeiro.
const events = (confirmed: string[][]) =>
  confirmed.map((ids, i) => ({ startsAt: daysAgo(7 * (i + 1)), confirmed: ids }));

describe('attendanceSummary', () => {
  it('conta presenças nos encontros depois da entrada e marca quem sumiu', () => {
    const rows = attendanceSummary({
      members: [
        { userId: 'ana', name: 'Ana', joinedAt: daysAgo(400) },
        { userId: 'bia', name: 'Bia', joinedAt: daysAgo(400) },
        { userId: 'novo', name: 'Novo', joinedAt: daysAgo(10) },
        { userId: 'caio', name: 'Caio', joinedAt: daysAgo(400) },
      ],
      events: events([
        ['ana'],
        ['ana'],
        ['ana'],
        ['ana'],
        ['ana', 'bia', 'caio'],
        ['bia'],
        ['bia'],
        ['bia'],
      ]),
      lastGame: { ana: daysAgo(7), bia: daysAgo(35), caio: daysAgo(5), novo: null },
      now,
    });
    const by = Object.fromEntries(rows.map((r) => [r.userId, r]));
    expect(by.bia).toMatchObject({ attended: 4, of: 8, lastGameAt: daysAgo(35) });
    // Bia: última presença há 35 dias (5º encontro), última partida há 35 dias.
    expect(by.bia!.awaySince).toEqual(daysAgo(35));
    // Caio faltou os 4 últimos, mas jogou há 5 dias: não está sumido.
    expect(by.caio!.awaySince).toBeNull();
    // Quem entrou há 10 dias: só conta o encontro depois da entrada, e nunca é sumido.
    expect(by.novo).toMatchObject({ attended: 0, of: 1, awaySince: null });
    expect(by.ana).toMatchObject({ attended: 5, of: 8, awaySince: null });
    // Sumidos primeiro, depois menor frequência.
    expect(rows[0]!.userId).toBe('bia');
  });

  it('sem encontros realizados ninguém está sumido', () => {
    const rows = attendanceSummary({
      members: [{ userId: 'ana', name: 'Ana', joinedAt: daysAgo(400) }],
      events: [],
      lastGame: { ana: null },
      now,
    });
    expect(rows[0]).toMatchObject({ attended: 0, of: 0, awaySince: null });
  });
});
