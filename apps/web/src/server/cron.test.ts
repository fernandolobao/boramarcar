import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  withMonitor: vi.fn((_slug: string, task: () => unknown) => task()),
  captureException: vi.fn(),
}));
const email = vi.hoisted(() => ({ deliverEmails: vi.fn(async () => []) }));
vi.mock('@sentry/nextjs', () => sentry);
vi.mock('./email', () => email);
vi.mock('@/env', () => ({
  getEnv: () => ({ CRON_SECRET: 's3cret-cron-value' }),
  adminEmails: () => ['dono@example.test'],
  getBaseUrl: () => 'https://www.arcanakin.com.br',
}));

const { runCron } = await import('./cron');

const request = () =>
  new Request('https://x/api/cron/reminders', {
    headers: { authorization: 'Bearer s3cret-cron-value' },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runCron', () => {
  it('recusa sem o segredo e não roda a tarefa', async () => {
    const task = vi.fn();
    const res = await runCron(new Request('https://x'), 'lembretes', '17 11 * * *', task);
    expect(res.status).toBe(401);
    expect(task).not.toHaveBeenCalled();
  });

  it('roda dentro do monitor do Sentry e devolve o resultado', async () => {
    const res = await runCron(request(), 'lembretes', '17 11 * * *', async () => ({ sent: 3 }));
    expect(await res.json()).toEqual({ sent: 3 });
    expect(sentry.withMonitor).toHaveBeenCalledWith(
      'lembretes',
      expect.any(Function),
      expect.objectContaining({ schedule: { type: 'crontab', value: '17 11 * * *' } }),
    );
    expect(email.deliverEmails).not.toHaveBeenCalled();
  });

  it('se falhar: manda ao Sentry, avisa o admin por e-mail e responde 500', async () => {
    const res = await runCron(request(), 'lembretes', '17 11 * * *', async () => {
      throw new Error('banco fora do ar');
    });
    expect(res.status).toBe(500);
    expect(sentry.captureException).toHaveBeenCalled();
    expect(email.deliverEmails).toHaveBeenCalledWith([
      expect.objectContaining({
        to: 'dono@example.test',
        subject: expect.stringContaining('lembretes'),
        text: expect.stringContaining('banco fora do ar'),
      }),
    ]);
  });
});
