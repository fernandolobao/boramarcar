import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);
// Sem cookie de sessão nos testes: o signOut do Better Auth não é chamado de verdade.
vi.mock('@/server/auth', () => ({
  getAuth: () => ({
    api: {
      signOut: async () => ({
        headers: new Headers([['Set-Cookie', 'better-auth.session_token=; Max-Age=0; Path=/']]),
      }),
    },
  }),
}));

const me = await import('../me/route');
const exportRoute = await import('../me/export/route');
const groups = await import('../groups/route');

let close: () => Promise<void>;
type U = Awaited<ReturnType<typeof createTestUser>>;
let ana: U;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  ana = await createTestUser(testDb.db, { name: 'Ana' });
  asUser(ana);
  await call(groups.POST, { method: 'POST', body: { name: 'Mesa da Ana' } });
});
afterAll(() => close());

describe('LGPD: meus dados e exclusão da conta', () => {
  it('exige login', async () => {
    testState.user = null;
    expect((await call(exportRoute.GET)).status).toBe(401);
    expect((await call(me.DELETE, { method: 'DELETE', body: { confirm: true } })).status).toBe(401);
    asUser(ana);
  });

  it('baixa os dados como arquivo JSON', async () => {
    const res = await call(exportRoute.GET);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="arcanakin-/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.body).toMatchObject({
      format: 'arcanakin-export',
      profile: { name: 'Ana', email: ana.email },
      groups: [{ group: 'Mesa da Ana', role: 'owner' }],
    });
  });

  it('avisa o que acontece com os grupos e só exclui com confirmação', async () => {
    expect((await call(me.GET)).body).toEqual({
      deletion: { transfers: [], deletions: ['Mesa da Ana'] },
    });
    expect((await call(me.DELETE, { method: 'DELETE', body: {} })).status).toBe(400);

    const res = await call(me.DELETE, { method: 'DELETE', body: { confirm: true } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ deleted: true });
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect((await call(exportRoute.GET)).status).toBe(404);
  });
});
