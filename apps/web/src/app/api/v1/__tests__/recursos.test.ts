import { createGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const features = await import('../me/features/route');

let close: () => Promise<void>;
beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  vi.unstubAllEnvs();
});

describe('GET /api/v1/me/features (recursos por flag, para o app)', () => {
  it('sem login: 401', async () => {
    expect((await call(features.GET)).status).toBe(401);
  });

  it('só liga o que a flag libera para o grupo da pessoa', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    await createGroup(testState.db!, { name: 'Mesa de Quinta', userId: ana.id });
    vi.stubEnv('FLAG_TABLE_COLORS_GROUPS', 'Mesa de Quinta');
    vi.stubEnv('FLAG_CARD_SCANNER_GROUPS', 'Outro grupo');
    asUser(ana);
    const res = await call(features.GET);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardScanner: false, tableColors: true });
  });
});
