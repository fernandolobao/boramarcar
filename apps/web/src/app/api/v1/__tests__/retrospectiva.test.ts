import { createGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const route = await import('../groups/[groupId]/monthly-link/route');

describe('link da retrospectiva para o app', () => {
  let close: () => Promise<void>;
  beforeAll(async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    const t = await createTestDb();
    testState.db = t.db;
    close = t.close;
  });
  afterAll(async () => {
    await close();
    vi.unstubAllEnvs();
  });

  it('quem é do grupo recebe o endereço com o código do mês; mês inválido é recusado', async () => {
    const ana = await createTestUser(testState.db!);
    const group = await createGroup(testState.db!, { name: 'Mesa', userId: ana.id });
    asUser(ana);
    const ok = await call(route.GET, {
      path: `/api/v1/groups/${group.id}/monthly-link?month=2026-10`,
      params: { groupId: group.id },
    });
    expect(ok.status).toBe(200);
    expect(ok.body!.url).toMatch(
      new RegExp(`/retrospectiva/${group.id}/2026-10\\?k=[A-Za-z0-9_-]{22}$`),
    );
    const bad = await call(route.GET, {
      path: `/api/v1/groups/${group.id}/monthly-link?month=2026-13`,
      params: { groupId: group.id },
    });
    expect(bad.status).toBe(400);
  });
});
