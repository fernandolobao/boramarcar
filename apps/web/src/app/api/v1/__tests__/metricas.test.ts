import { createTestDb } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { dbMock, testState } from '@/test/api';

vi.mock('@/server/db', () => dbMock);

const cron = await import('../../cron/reminders/route');
const { sendMetricsEmail, metricsSummary } = await import('@/server/metrics-email');

let close: () => Promise<void>;
const sent: { to: string[]; subject: string; text: string }[] = [];

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAILS = 'dono@example.com';
  process.env.CRON_SECRET = 'segredo-do-cron-123';
  resetEnvCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return Response.json({ id: 'x' });
    }),
  );
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(async () => {
  vi.unstubAllGlobals();
  for (const k of ['RESEND_API_KEY', 'ADMIN_EMAILS', 'CRON_SECRET']) delete process.env[k];
  resetEnvCache();
  await close();
});

describe('resumo semanal das métricas (8.3)', () => {
  it('manda só números agregados para ADMIN_EMAILS', async () => {
    await sendMetricsEmail(testState.db!, new Date('2026-11-16T12:00:00Z'));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual(['dono@example.com']);
    expect(sent[0]!.subject).toBe('ArcanaKin: resumo semanal do beta');
    expect(sent[0]!.text).toContain('Métrica norte: 0 de 0 grupos');
    expect(sent[0]!.text).toContain('/admin');
  });

  it('o cron diário só manda o resumo às segundas', async () => {
    sent.splice(0);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T11:17:00Z')); // terça
    const req = () =>
      new Request('http://localhost/api/cron/reminders', {
        headers: { Authorization: 'Bearer segredo-do-cron-123' },
      });
    const tuesday = await (await cron.GET(req())).json();
    expect(tuesday.metricsEmails).toBe(0);
    vi.setSystemTime(new Date('2026-11-16T11:17:00Z')); // segunda
    const monday = await (await cron.GET(req())).json();
    expect(monday.metricsEmails).toBe(1);
    vi.useRealTimers();
    expect(metricsSummary).toBeTypeOf('function');
  });
});
