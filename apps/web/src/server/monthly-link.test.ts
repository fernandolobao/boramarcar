import { createGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Database } from '@boramarcar/db';
import { canSeeMonthlyRecap, monthlyKey } from './monthly-link';

describe('link da retrospectiva do mês: um código por grupo e mês', () => {
  let db: Database;
  let close: () => Promise<void>;
  beforeAll(async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    ({ db, close } = await createTestDb());
  });
  afterAll(async () => {
    await close();
    vi.unstubAllEnvs();
  });

  it('o código de um mês não abre outro mês nem outro grupo', () => {
    const k = monthlyKey('g1', '2026-10');
    expect(k).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(monthlyKey('g1', '2026-10')).toBe(k);
    expect(monthlyKey('g1', '2026-09')).not.toBe(k);
    expect(monthlyKey('g2', '2026-10')).not.toBe(k);
  });

  it('abre com o código certo, ou para quem é do grupo e está logado', async () => {
    const ana = await createTestUser(db);
    const estranho = await createTestUser(db);
    const group = await createGroup(db, { name: 'Mesa', userId: ana.id });
    const month = '2026-10';
    const base = { groupId: group.id, month };
    expect(
      await canSeeMonthlyRecap(db, { ...base, key: monthlyKey(group.id, month), userId: null }),
    ).toBe(true);
    expect(
      await canSeeMonthlyRecap(db, { ...base, key: monthlyKey(group.id, '2026-09'), userId: null }),
    ).toBe(false);
    expect(await canSeeMonthlyRecap(db, { ...base, key: undefined, userId: null })).toBe(false);
    expect(await canSeeMonthlyRecap(db, { ...base, key: 'x', userId: estranho.id })).toBe(false);
    expect(await canSeeMonthlyRecap(db, { ...base, key: undefined, userId: ana.id })).toBe(true);
  });
});
