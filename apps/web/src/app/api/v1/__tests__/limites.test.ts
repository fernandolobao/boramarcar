import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const invite = await import('../groups/[groupId]/invite/route');
const cspReport = await import('../../csp-report/route');
const locate = await import('../places/locate/route');
const collection = await import('../collection/route');
const { clientKey } = await import('@/server/limits');

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
    // Relógio parado no começo de um minuto: a janela do limite (1 minuto) não vira no meio do
    // teste (antes, às vezes o 61º relatório caía na janela seguinte e era registrado).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T12:00:05Z'));
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
    vi.useRealTimers();
  });

  it('relatório de CSP sem Content-Length: lê só até o teto, não o corpo inteiro', async () => {
    let pulled = 0;
    const chunk = new TextEncoder().encode('a'.repeat(4096));
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += chunk.length;
        if (pulled > 1_000_000) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const res = await cspReport.POST(
      new Request('http://localhost/api/csp-report', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.9.9.9' },
        body: stream,
        // @ts-expect-error -- necessário no Node para corpo em stream
        duplex: 'half',
      }),
    );
    expect(res.status).toBe(204);
    expect(pulled).toBeLessThan(64_000);
  });

  it('IP guardado só como HMAC (com segredo), não um hash simples que dá para reverter', async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    const req = new Request('http://localhost/', { headers: { 'x-forwarded-for': '200.1.2.3' } });
    const plain = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('200.1.2.3')),
      ).slice(0, 12),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    expect(await clientKey(req)).toMatch(/^[0-9a-f]{24}$/);
    expect(await clientKey(req)).not.toBe(plain);
    vi.unstubAllEnvs();
  });

  it('localizar endereço (Nominatim): limite por pessoa', async () => {
    asUser(await createTestUser(testState.db!, { name: 'Mapeador' }));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json([]));
    const statuses = [];
    for (let i = 0; i < 121; i += 1) {
      statuses.push(
        (await call(locate.GET, { path: `/api/v1/places/locate?q=Rua+${i}+10` })).status,
      );
    }
    expect(statuses.slice(0, 120).every((s) => s === 200)).toBe(true);
    expect(statuses[120]).toBe(429);
  });

  it('coleção: ID de carta só com letras, números e hífen', async () => {
    asUser(await createTestUser(testState.db!, { name: 'Colecionador' }));
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(null, { status: 404 }),
    );
    const res = await call(collection.POST, {
      method: 'POST',
      body: { name: 'Sol Ring', scryfallId: '../../cards/search', quantity: 1 },
    });
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
