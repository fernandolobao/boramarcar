import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { sentryOptions, withoutIp } from './sentry-options';

describe('sentryOptions', () => {
  it('sem DSN, o Sentry fica desligado', () => {
    expect(sentryOptions({}).enabled).toBe(false);
  });

  it('com DSN, liga sem dados pessoais e usa o ambiente da Vercel', () => {
    const options = sentryOptions({
      NEXT_PUBLIC_SENTRY_DSN: 'https://chave@o1.ingest.sentry.io/1',
      VERCEL_ENV: 'preview',
    });
    expect(options).toMatchObject({ enabled: true, sendDefaultPii: false, environment: 'preview' });
  });
});

describe('withoutIp', () => {
  it('impede o Sentry de guardar o IP e tira cabeçalhos pessoais', () => {
    const event = withoutIp({
      type: undefined,
      user: { id: 'u1' },
      request: { headers: { 'X-Forwarded-For': '1.2.3.4', cookie: 'a=b', 'user-agent': 'x' } },
    } as ErrorEvent);
    expect(event.user).toEqual({ id: 'u1', ip_address: null });
    expect(event.request?.headers).toEqual({ 'user-agent': 'x' });
  });

  it('rastreamento completo só em desenvolvimento', () => {
    expect(sentryOptions({}).tracesSampleRate).toBe(1);
    expect(sentryOptions({ VERCEL_ENV: 'production' }).tracesSampleRate).toBe(0.1);
  });
});
