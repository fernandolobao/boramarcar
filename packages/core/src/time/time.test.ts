import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import {
  addLocalDays,
  isValidTimeZone,
  localRangeToUtc,
  timeZoneOffsetMs,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from './index';

describe('isValidTimeZone', () => {
  it.each([
    ['America/Sao_Paulo', true],
    ['Europe/Lisbon', true],
    ['UTC', true],
    ['Marte/Olympus', false],
    ['', false],
    [42, false],
  ])('%s → %s', (tz, expected) => {
    expect(isValidTimeZone(tz)).toBe(expected);
  });
});

describe('zonedLocalToUtc / utcToZonedLocalInput', () => {
  it('converte horário de São Paulo (UTC-3)', () => {
    const utc = zonedLocalToUtc('2026-11-14T19:30', 'America/Sao_Paulo');
    expect(utc.toISOString()).toBe('2026-11-14T22:30:00.000Z');
    expect(utcToZonedLocalInput(utc, 'America/Sao_Paulo')).toBe('2026-11-14T19:30');
  });

  it('respeita horário de verão em outros fusos', () => {
    // Lisboa: inverno UTC+0, verão UTC+1
    expect(zonedLocalToUtc('2026-01-10T20:00', 'Europe/Lisbon').toISOString()).toBe(
      '2026-01-10T20:00:00.000Z',
    );
    expect(zonedLocalToUtc('2026-07-10T20:00', 'Europe/Lisbon').toISOString()).toBe(
      '2026-07-10T19:00:00.000Z',
    );
    // Nova York: UTC-5 / UTC-4
    expect(zonedLocalToUtc('2026-12-01T09:15', 'America/New_York').toISOString()).toBe(
      '2026-12-01T14:15:00.000Z',
    );
  });

  it('avança horários inexistentes na troca para o horário de verão', () => {
    // 08/03/2026 02:30 não existe em Nova York (pula de 02:00 para 03:00)
    const utc = zonedLocalToUtc('2026-03-08T02:30', 'America/New_York');
    expect(utcToZonedLocalInput(utc, 'America/New_York')).toBe('2026-03-08T03:30');
  });

  it('calcula o deslocamento do fuso', () => {
    expect(timeZoneOffsetMs(new Date('2026-11-14T12:00:00Z'), 'America/Sao_Paulo')).toBe(
      -3 * 3600_000,
    );
    expect(timeZoneOffsetMs(new Date('2026-11-14T12:00:00Z'), 'Asia/Kolkata')).toBe(5.5 * 3600_000);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => zonedLocalToUtc('14/11/2026 19:30', 'America/Sao_Paulo')).toThrow(DomainError);
    expect(() => zonedLocalToUtc('2026-11-14T19:30', 'Lua/Base')).toThrow(DomainError);
  });
});

describe('localRangeToUtc', () => {
  it('converte data e horários locais no fuso do usuário', () => {
    const { startsAt, endsAt } = localRangeToUtc(
      '2026-11-14',
      '19:00',
      '23:30',
      'America/Sao_Paulo',
    );
    expect(startsAt.toISOString()).toBe('2026-11-14T22:00:00.000Z');
    expect(endsAt?.toISOString()).toBe('2026-11-15T02:30:00.000Z');
  });

  it('fim antes (ou igual) do início termina no dia seguinte', () => {
    const { endsAt } = localRangeToUtc('2026-12-31', '20:00', '01:00', 'America/Sao_Paulo');
    expect(endsAt?.toISOString()).toBe('2027-01-01T04:00:00.000Z');
  });

  it('sem fim devolve null', () => {
    expect(localRangeToUtc('2026-11-14', '19:00', null, 'UTC').endsAt).toBeNull();
  });

  it('addLocalDays atravessa meses e anos e rejeita datas inválidas', () => {
    expect(addLocalDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(() => addLocalDays('ontem', 1)).toThrow(DomainError);
  });
});
