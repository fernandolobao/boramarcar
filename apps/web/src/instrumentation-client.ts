import * as Sentry from '@sentry/nextjs';
import { config as zodConfig } from 'zod';
import { sentryOptions } from '@/lib/sentry-options';

// O Zod 4 testa `new Function` para validar mais rápido; a CSP não permite eval e registraria
// uma violação a cada página. Sem esse teste (jitless), o Zod valida do jeito normal.
zodConfig({ jitless: true });

// Erros no navegador (ver `lib/sentry-options.ts`).
Sentry.init(
  sentryOptions({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  }),
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
