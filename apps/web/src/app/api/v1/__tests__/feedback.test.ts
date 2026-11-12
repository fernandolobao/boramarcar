import { listRecentFeedback } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { backgroundTasks, flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const feedback = await import('../feedback/route');

let close: () => Promise<void>;
let sent: { to: string[]; subject: string; text: string; html: string }[] = [];
const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
  sent.push(JSON.parse(init.body as string));
  return Response.json({ id: 'email' });
});

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAILS = 'dono@example.com, ';
  resetEnvCache();
  vi.stubGlobal('fetch', fetchMock);
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

describe('POST /api/v1/feedback', () => {
  it('guarda, avisa quem administra (texto escapado) e limita por hora', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana <b>' });
    asUser(ana);
    const bad = await call(feedback.POST, { method: 'POST', body: { kind: 'x', message: 'oi' } });
    expect(bad.status).toBe(400);

    const ok = await call(feedback.POST, {
      method: 'POST',
      body: {
        kind: 'problem',
        message: 'O <script> do botão não salva',
        page: '/eventos/1?segredo=1',
        platform: 'web',
      },
    });
    expect(ok.status).toBe(201);
    await flushBackground();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual(['dono@example.com']);
    expect(sent[0]!.subject).toBe('Feedback (Algo não funcionou): Ana <b>');
    expect(sent[0]!.html).toContain('&lt;script&gt;');
    expect(sent[0]!.html).not.toContain('<script>');
    expect(sent[0]!.text).toContain('Página: /eventos/1');
    expect(sent[0]!.text).not.toContain('segredo');
    expect((await listRecentFeedback(testState.db!))[0]).toMatchObject({ page: '/eventos/1' });

    for (let i = 0; i < 9; i += 1) {
      await call(feedback.POST, {
        method: 'POST',
        body: { kind: 'idea', message: 'Mais uma ideia' },
      });
    }
    const limited = await call(feedback.POST, {
      method: 'POST',
      body: { kind: 'idea', message: 'Mais uma ideia' },
    });
    expect(limited.status).toBe(429);
  });
});
