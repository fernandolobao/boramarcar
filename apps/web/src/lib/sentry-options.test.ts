import { describe, expect, it } from 'vitest';
import { sentryOptions } from './sentry-options';

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
