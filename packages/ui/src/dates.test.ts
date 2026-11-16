import { describe, expect, it } from 'vitest';
import {
  addDaysToDate,
  addMonthsToDate,
  clampDate,
  compareDates,
  isDateString,
  isTimeString,
  monthGrid,
  stepTime,
} from './dates';

describe('datas como texto', () => {
  it('valida AAAA-MM-DD e HH:MM', () => {
    expect(isDateString('2026-11-15')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-2-3')).toBe(false);
    expect(isTimeString('19:30')).toBe(true);
    expect(isTimeString('24:00')).toBe(false);
    expect(isTimeString('9:30')).toBe(false);
  });

  it('soma dias e meses na virada do ano e em fevereiro', () => {
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsToDate('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('compara e limita', () => {
    expect(compareDates('2026-11-15', '2026-11-16')).toBeLessThan(0);
    expect(compareDates('2026-11-16', '2026-11-16')).toBe(0);
    expect(clampDate('2026-11-01', '2026-11-15', '2026-12-31')).toBe('2026-11-15');
    expect(clampDate('2027-02-01', '2026-11-15', '2026-12-31')).toBe('2026-12-31');
    expect(clampDate('2026-11-20')).toBe('2026-11-20');
  });

  it('grade do mês: semanas de 7, null fora do mês, começando no domingo ou na segunda', () => {
    const sunday = monthGrid(2026, 11, 0);
    // Novembro de 2026 começa num domingo.
    expect(sunday[0]).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    expect(sunday.flat().filter(Boolean)).toHaveLength(30);
    const monday = monthGrid(2026, 11, 1);
    expect(monday[0]!.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(monday.every((week) => week.length === 7)).toBe(true);
  });

  it('passos de horário dão a volta no dia', () => {
    expect(stepTime('19:00', 30)).toBe('19:30');
    expect(stepTime('23:30', 60)).toBe('00:30');
    expect(stepTime('00:15', -30)).toBe('23:45');
  });
});
