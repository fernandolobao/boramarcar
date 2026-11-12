import { listPushTargets } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { backgroundTasks, flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const events = await import('../groups/[groupId]/events/route');
const event = await import('../events/[eventId]/route');
const rsvp = await import('../events/[eventId]/rsvp/route');
const preferences = await import('../me/preferences/route');
const pushTokens = await import('../me/push-tokens/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let ana: U, bia: U, caio: U;
let groupId: string;

interface Push {
  to: string;
  title: string;
  body: string;
  data?: { url: string };
}
let pushes: Push[] = [];
/** Tokens que o Expo responde como "não existe mais". */
const gone = new Set<string>();
const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  if (!String(url).includes('exp.host')) return Response.json({ id: 'email' });
  const batch = JSON.parse(init.body as string) as Push[];
  pushes.push(...batch);
  return Response.json({
    data: batch.map((m) =>
      gone.has(m.to)
        ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: 't' },
    ),
  });
});

const BIA = 'ExponentPushToken[biabiabia1]';
const CAIO = 'ExponentPushToken[caiocaio1]';
const ANA = 'ExponentPushToken[anaanaana1]';

beforeAll(async () => {
  resetEnvCache();
  vi.stubGlobal('fetch', fetchMock);
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia, caio] = (await Promise.all(
    ['Ana', 'Bia', 'Caio'].map((name) => createTestUser(testDb.db, { name })),
  )) as [U, U, U];
  asUser(ana);
  const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
  groupId = created.body!.group.id;
  for (const u of [bia, caio]) {
    asUser(u);
    await call(join.POST, { method: 'POST', body: { inviteCode: created.body!.group.inviteCode } });
  }
  // Caio não quer e-mails, mas ligou o push no celular: recebe o push mesmo assim.
  asUser(caio);
  await call(preferences.PUT, { method: 'PUT', body: { emailNotifications: false } });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  resetEnvCache();
  await close();
});
beforeEach(() => {
  pushes = [];
  backgroundTasks.splice(0);
});
afterEach(() => {
  testState.user = null;
});

describe('notificações push', () => {
  it('valida o token e liga o push em cada aparelho', async () => {
    asUser(bia);
    const bad = await call(pushTokens.POST, {
      method: 'POST',
      body: { token: 'nao-e-token', platform: 'ios' },
    });
    expect(bad.status).toBe(400);
    for (const [u, token, platform] of [
      [bia, BIA, 'ios'],
      [caio, CAIO, 'android'],
      [ana, ANA, 'ios'],
    ] as const) {
      asUser(u);
      const res = await call(pushTokens.POST, { method: 'POST', body: { token, platform } });
      expect(res.status).toBe(200);
    }
  });

  it('encontro novo vai para os aparelhos do grupo (menos de quem criou) e abre o encontro', async () => {
    asUser(ana);
    const res = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Commander', startsAt: new Date(Date.now() + 5 * 864e5).toISOString() },
    });
    const eventId = res.body!.event.id as string;
    await flushBackground();
    expect(pushes.map((p) => p.to).sort()).toEqual([BIA, CAIO].sort());
    expect(pushes[0]!.title).toBe('Novo encontro em Mesa');
    expect(pushes[0]!.data).toEqual({ url: `/encontros/${eventId}` });

    for (const u of [bia, caio]) {
      asUser(u);
      await call(rsvp.PUT, { method: 'PUT', params: { eventId }, body: { rsvp: 'yes' } });
    }
    await flushBackground();
    // Token que o Expo não reconhece mais é apagado.
    gone.add(CAIO);
    pushes = [];
    asUser(ana);
    await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: { status: 'cancelled' },
    });
    await flushBackground();
    expect(pushes.map((p) => p.title)).toContain('Encontro cancelado');
    expect(await listPushTargets(testState.db!, [caio.id])).toEqual([]);
  });

  it('desligar o push no aparelho apaga o token', async () => {
    asUser(bia);
    const res = await call(pushTokens.DELETE, { method: 'DELETE', body: { token: BIA } });
    expect(res.status).toBe(200);
    expect(await listPushTargets(testState.db!, [bia.id])).toEqual([]);
  });
});
