import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const load = () => import('./env');

describe('getEnv', () => {
  it('valida as variáveis obrigatórias', async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '');
    vi.stubEnv('DATABASE_URL', 'nao-e-url');
    vi.stubEnv('BETTER_AUTH_SECRET', 'curto');
    const { getEnv } = await load();
    expect(() => getEnv()).toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/);
  });

  it('aceita configuração válida', async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '');
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@host/db');
    vi.stubEnv('BETTER_AUTH_SECRET', 's'.repeat(32));
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret');
    const { getEnv } = await load();
    expect(getEnv().GOOGLE_CLIENT_ID).toBe('id');
  });
});

describe('getBaseUrl', () => {
  it('usa BETTER_AUTH_URL, depois VERCEL_URL, depois localhost', async () => {
    const { getBaseUrl } = await load();
    const base = {
      DATABASE_URL: '',
      BETTER_AUTH_SECRET: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      EMAIL_FROM: 'Bora Marcar <x@example.com>',
    };
    expect(
      getBaseUrl({ ...base, BETTER_AUTH_URL: 'https://a.app', VERCEL_URL: 'b.vercel.app' }),
    ).toBe('https://a.app');
    expect(getBaseUrl({ ...base, VERCEL_URL: 'b.vercel.app' })).toBe('https://b.vercel.app');
    expect(getBaseUrl(base)).toBe('http://localhost:3000');
  });
});
