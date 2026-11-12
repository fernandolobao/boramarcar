import { describe, expect, it } from 'vitest';
import { BETA_WEEKS, betaState } from '.';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date('2026-12-01T03:00:00Z');

describe('betaState', () => {
  it('sem data é rascunho; com data futura, marcado', () => {
    expect(betaState({ startsAt: null, endedAt: null }, start).phase).toBe('draft');
    const s = betaState({ startsAt: start, endedAt: null }, new Date(start.getTime() - DAY));
    expect(s).toMatchObject({ phase: 'scheduled', week: null });
    expect(s.endsAt).toEqual(new Date(start.getTime() + BETA_WEEKS * 7 * DAY));
  });

  it('conta as semanas de 1 a 8 e termina sozinho', () => {
    expect(betaState({ startsAt: start, endedAt: null }, start).week).toBe(1);
    expect(
      betaState({ startsAt: start, endedAt: null }, new Date(start.getTime() + 15 * DAY)).week,
    ).toBe(3);
    expect(
      betaState({ startsAt: start, endedAt: null }, new Date(start.getTime() + 56 * DAY - 1)).week,
    ).toBe(8);
    expect(
      betaState({ startsAt: start, endedAt: null }, new Date(start.getTime() + 56 * DAY)).phase,
    ).toBe('ended');
  });

  it('encerrado antes da hora', () => {
    const endedAt = new Date(start.getTime() + 10 * DAY);
    const s = betaState({ startsAt: start, endedAt }, new Date(start.getTime() + 11 * DAY));
    expect(s).toMatchObject({ phase: 'ended', endsAt: endedAt });
  });
});
