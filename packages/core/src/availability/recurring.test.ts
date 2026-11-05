import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { assertLocalDate, assertWeeklyRule, expandWeeklyRules, type WeeklyRule } from './recurring';
import { findCommonWindows } from './index';

const rule = (overrides: Partial<WeeklyRule> = {}): WeeklyRule => ({
  id: 'r1',
  userId: 'ana',
  weekday: 4, // quinta
  startTime: '19:00',
  endTime: '23:00',
  timeZone: 'America/Sao_Paulo',
  locationIds: [],
  exceptions: [],
  ...overrides,
});

// Novembro de 2026: quintas nos dias 5, 12, 19, 26
const from = new Date('2026-11-01T03:00:00Z');
const to = new Date('2026-12-01T03:00:00Z');

describe('expandWeeklyRules', () => {
  it('gera uma ocorrência por semana no fuso da regra', () => {
    const occ = expandWeeklyRules([rule()], from, to);
    expect(occ.map((o) => o.date)).toEqual([
      '2026-11-05',
      '2026-11-12',
      '2026-11-19',
      '2026-11-26',
    ]);
    expect(occ[0]).toMatchObject({
      ruleId: 'r1',
      userId: 'ana',
      start: new Date('2026-11-05T22:00:00Z'),
      end: new Date('2026-11-06T02:00:00Z'),
    });
  });

  it('respeita exceções e regras que atravessam a meia-noite', () => {
    const occ = expandWeeklyRules(
      [rule({ exceptions: ['2026-11-12'], startTime: '20:00', endTime: '01:00' })],
      from,
      to,
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-11-05', '2026-11-19', '2026-11-26']);
    expect(occ[0]?.end).toEqual(new Date('2026-11-06T04:00:00Z'));
  });

  it('mantém o horário local na troca de horário de verão', () => {
    const occ = expandWeeklyRules(
      [rule({ weekday: 6, startTime: '18:00', endTime: '22:00', timeZone: 'Europe/Lisbon' })],
      new Date('2026-10-17T00:00:00Z'),
      new Date('2026-11-01T00:00:00Z'),
    );
    // 17/10 (verão, UTC+1) e 24/10 (verão) e 31/10 (inverno, UTC+0)
    expect(occ.map((o) => o.start.toISOString())).toEqual([
      '2026-10-17T17:00:00.000Z',
      '2026-10-24T17:00:00.000Z',
      '2026-10-31T18:00:00.000Z',
    ]);
  });

  it('inclui ocorrência que começou antes do intervalo e ainda não terminou', () => {
    const occ = expandWeeklyRules(
      [rule()],
      new Date('2026-11-06T01:00:00Z'),
      new Date('2026-11-06T05:00:00Z'),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0]?.date).toBe('2026-11-05');
  });

  it('combina com disponibilidades avulsas no cálculo de janelas', () => {
    const recurring = expandWeeklyRules(
      ['ana', 'bia', 'caio'].map((userId, i) => rule({ id: `r${i}`, userId })),
      from,
      to,
    );
    const oneOff = {
      userId: 'duda',
      start: new Date('2026-11-12T21:00:00Z'),
      end: new Date('2026-11-13T03:00:00Z'),
      locationIds: [],
    };
    const windows = findCommonWindows([...recurring, oneOff], { minDurationMinutes: 120 });
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      start: new Date('2026-11-12T22:00:00Z'),
      userIds: ['ana', 'bia', 'caio', 'duda'],
    });
  });
});

describe('validação', () => {
  it.each([
    [{ weekday: 7 }],
    [{ startTime: '25:00' }],
    [{ endTime: '9:00' }],
    [{ startTime: '19:00', endTime: '19:00' }],
    [{ timeZone: 'Lua/Base' }],
  ])('rejeita %o', (overrides) => {
    expect(() => assertWeeklyRule(rule(overrides))).toThrow(DomainError);
  });

  it('valida datas locais', () => {
    expect(() => assertLocalDate('2026-11-12')).not.toThrow();
    expect(() => assertLocalDate('12/11/2026')).toThrow(DomainError);
    expect(() => assertLocalDate('2026-13-40')).toThrow(DomainError);
  });
});
