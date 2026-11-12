import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const invite = await import('../groups/[groupId]/invite/route');
const cspReport = await import('../../csp-report/route');

let close: () => Promise<void>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  vi.restoreAllMocks();
});

describe('limites de uso (8.2)', () => {
  it('entrar por convite: códigos no chute param no limite (429)', async () => {
    asUser(await createTestUser(testState.db!, { name: 'Chutador' }));
    const attempts = [];
    for (let i = 0; i < 21; i += 1) {
      attempts.push(
        (await call(join.POST, { method: 'POST', body: { inviteCode: `CHUTE${i}` } })).status,
      );
    }
    expect(attempts.slice(0, 20).every((s) => s === 404)).toBe(true);
    expect(attempts[20]).toBe(429);
  });

  it('criar grupo e trocar convite dividem um limite por hora', async () => {
    asUser(await createTestUser(testState.db!, { name: 'Muitos grupos' }));
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa 0' } });
    const groupId = created.body!.group.id as string;
    for (let i = 1; i < 20; i += 1) {
      const status = (await call(invite.POST, { method: 'POST', params: { groupId } })).status;
      expect(status).toBe(200);
    }
    expect((await call(groups.POST, { method: 'POST', body: { name: 'Mesa 21' } })).status).toBe(
      429,
    );
  });

  it('relatório de CSP: corpo grande e excesso por endereço são descartados sem log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const report = (ip: string, body = '{"csp-report":{"violated-directive":"img-src"}}') =>
      cspReport.POST(
        new Request('http://localhost/api/csp-report', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip, 'content-length': String(body.length) },
          body,
        }),
      );
    const big = await report('10.0.0.1', `{"x":"${'a'.repeat(20_000)}"}`);
    expect(big.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();

    for (let i = 0; i < 60; i += 1) expect((await report('10.0.0.2')).status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(60);
    await report('10.0.0.2');
    expect(warn).toHaveBeenCalledTimes(60);
    // Outro endereço continua sendo registrado.
    await report('10.0.0.3');
    expect(warn).toHaveBeenCalledTimes(61);
  });
});
