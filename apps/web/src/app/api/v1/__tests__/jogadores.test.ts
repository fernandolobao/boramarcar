import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const player = await import('../players/[userId]/route');

let close: () => Promise<void>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  delete process.env.ADMIN_EMAILS;
});

describe('GET /api/v1/players/:userId', () => {
  it('admin da plataforma vê o perfil de quem não divide grupo; os outros, não', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    const admin = await createTestUser(testState.db!, { name: 'Admin' });
    const bia = await createTestUser(testState.db!, { name: 'Bia' });
    process.env.ADMIN_EMAILS = admin.email;

    asUser(bia);
    const denied = await call(player.GET, { params: { userId: ana.id } });
    expect(denied.status).toBe(404);

    asUser(admin);
    const ok = await call(player.GET, { params: { userId: ana.id } });
    expect(ok.status).toBe(200);
    expect(ok.body!.player).toMatchObject({ name: 'Ana', email: null });
  });
});
