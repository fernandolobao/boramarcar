import { createGroup, joinGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { backgroundTasks, flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const beta = await import('../admin/beta/route');
const encerrar = await import('../admin/beta/encerrar/route');

let close: () => Promise<void>;
let sent: { to: string[]; subject: string; text: string }[] = [];

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAILS = 'dono@example.com';
  resetEnvCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return Response.json({ id: 'email' });
    }),
  );
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.ADMIN_EMAILS;
  resetEnvCache();
  await close();
});
beforeEach(() => {
  sent = [];
  backgroundTasks.splice(0);
});
afterEach(() => {
  testState.user = null;
});

describe('beta assistido (8.5)', () => {
  it('só quem administra vê e muda o beta; quem não é recebe 404 sem dados', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    asUser(ana);
    for (const response of [
      await call(beta.GET),
      await call(beta.PUT, { method: 'PUT', body: { groupIds: [], startsAt: null } }),
      await call(encerrar.POST, { method: 'POST' }),
    ]) {
      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain('groups');
    }
  });

  it('marca a data, começa agora com boas-vindas uma vez por grupo e encerra', async () => {
    const dono = await createTestUser(testState.db!, { name: 'Dono', email: 'dono@example.com' });
    const bia = await createTestUser(testState.db!, { name: 'Bia', email: 'bia@example.com' });
    const group = await createGroup(testState.db!, { name: 'Mesa da Bia', userId: bia.id });
    asUser(dono);

    const listed = (await call(beta.GET)).body!;
    expect(listed.state.phase).toBe('draft');
    expect(listed.groups).toEqual([expect.objectContaining({ id: group.id, inBeta: false })]);

    const later = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const scheduled = await call(beta.PUT, {
      method: 'PUT',
      body: { groupIds: [group.id], startsAt: later },
    });
    expect(scheduled.body!.state.phase).toBe('scheduled');
    await flushBackground();
    expect(sent).toHaveLength(0);

    const started = await call(beta.PUT, {
      method: 'PUT',
      body: { groupIds: [group.id], startsAt: new Date().toISOString() },
    });
    expect(started.body!.state).toMatchObject({ phase: 'running', week: 1 });
    await flushBackground();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual(['bia@example.com']);
    expect(sent[0]!.subject).toBe('Mesa da Bia está no beta do ArcanaKin');
    expect(sent[0]!.text).toContain('/feedback?de=/painel');

    // Salvar de novo não repete as boas-vindas; quem entra depois no grupo não muda isso.
    const cris = await createTestUser(testState.db!, { name: 'Cris' });
    await joinGroup(testState.db!, { inviteCode: group.inviteCode, userId: cris.id });
    await call(beta.PUT, {
      method: 'PUT',
      body: { groupIds: [group.id], startsAt: new Date().toISOString() },
    });
    await flushBackground();
    expect(sent).toHaveLength(1);

    const ended = await call(encerrar.POST, { method: 'POST' });
    expect(ended.body!.state.phase).toBe('ended');
  });

  it('valida o corpo', async () => {
    asUser({ id: 'dono-2', name: 'Dono', email: 'dono@example.com' });
    const bad = await call(beta.PUT, { method: 'PUT', body: { groupIds: 'x', startsAt: 'ontem' } });
    expect(bad.status).toBe(400);
  });
});
