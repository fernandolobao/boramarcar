import { describe, expect, it } from 'vitest';
import { buildWeekGrid, weekStartFor } from './grid';

const TZ = 'America/Sao_Paulo';
const local = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);

describe('weekStartFor', () => {
  it('volta para a segunda-feira no fuso do usuário', () => {
    expect(weekStartFor(new Date('2026-11-12T15:00:00Z'), TZ)).toBe('2026-11-09'); // quinta
    expect(weekStartFor(new Date('2026-11-09T02:00:00Z'), TZ)).toBe('2026-11-02'); // domingo 23h local
    expect(weekStartFor(new Date('2026-11-09T12:00:00Z'), TZ)).toBe('2026-11-09'); // segunda
  });
});

describe('buildWeekGrid', () => {
  const grid = buildWeekGrid({
    weekStart: '2026-11-09',
    timeZone: TZ,
    currentUserId: 'ana',
    hours: [18, 19, 20, 23],
    slots: [
      {
        userId: 'ana',
        start: local('2026-11-12', '19:00'),
        end: local('2026-11-12', '21:00'),
        kind: 'once',
      },
      {
        userId: 'bia',
        start: local('2026-11-12', '18:30'),
        end: local('2026-11-13', '00:00'),
        kind: 'weekly',
      },
      {
        userId: 'ana',
        start: local('2026-11-14', '23:00'),
        end: local('2026-11-15', '01:00'),
        kind: 'weekly',
      },
    ],
  });

  it('gera 7 dias a partir da segunda', () => {
    expect(grid.days).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(grid.cells).toHaveLength(7);
    expect(grid.cells[0]).toHaveLength(4);
  });

  it('conta quem cobre a hora inteira e marca a situação do usuário', () => {
    const thursday = grid.cells[3]!;
    expect(thursday[0]).toMatchObject({ userIds: [], mine: 'none' }); // 18h: Bia só a partir de 18:30
    expect(thursday[1]).toMatchObject({
      userIds: ['ana', 'bia'],
      mine: 'once',
      start: '2026-11-12T22:00:00.000Z',
      end: '2026-11-12T23:00:00.000Z',
    });
    expect(thursday[2]).toMatchObject({ userIds: ['ana', 'bia'], mine: 'once' });
    expect(thursday[3]).toMatchObject({
      userIds: ['bia'],
      mine: 'none',
      end: '2026-11-13T03:00:00.000Z',
    });
    expect(grid.cells[5]![3]).toMatchObject({ userIds: ['ana'], mine: 'weekly' }); // sábado 23h
  });
});
