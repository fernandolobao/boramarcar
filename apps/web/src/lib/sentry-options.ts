/**
 * Opções do Sentry comuns ao navegador, ao servidor e ao edge. Sem DSN, o Sentry não é ligado
 * (desenvolvimento, testes e previews sem a variável). Sem dados pessoais: nada de IP, cookies
 * ou cabeçalhos (`sendDefaultPii: false`), sem gravação de tela e só 10% de rastreamento.
 */
export function sentryOptions(env: Record<string, string | undefined> = process.env) {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  };
}
