import { describe, expect, it } from 'vitest';
import { isNewMember } from './welcome';

describe('boas-vindas no painel', () => {
  it('quem entrou no grupo há menos de 30 dias é "novo"', () => {
    const now = new Date('2026-11-30T12:00:00Z');
    expect(isNewMember(new Date('2026-11-20T12:00:00Z'), now)).toBe(true);
    expect(isNewMember(new Date('2026-10-31T12:00:01Z'), now)).toBe(true);
    expect(isNewMember(new Date('2026-10-31T12:00:00Z'), now)).toBe(false);
    expect(isNewMember(null, now)).toBe(false);
  });
});
