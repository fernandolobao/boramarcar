import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry-options';

// Erros no servidor (Node e edge), incluindo os de renderização (`onRequestError`).
export function register() {
  Sentry.init(sentryOptions());
}

export const onRequestError = Sentry.captureRequestError;
