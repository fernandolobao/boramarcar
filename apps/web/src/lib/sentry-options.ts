import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Tira o IP do evento: o Sentry infere o IP da conexão quando o evento não diz nada, e a
 * política de privacidade promete erros sem dados de quem usa. `null` explícito impede a
 * inferência; no projeto do Sentry, "Prevent Storing of IP Addresses" garante o mesmo do lado de lá.
 */
export function withoutIp(event: ErrorEvent): ErrorEvent {
  event.user = { ...event.user, ip_address: null };
  if (event.request?.headers) {
    for (const name of Object.keys(event.request.headers)) {
      if (/^(x-forwarded-for|x-real-ip|cookie|authorization)$/i.test(name)) {
        delete event.request.headers[name];
      }
    }
  }
  return event;
}

/**
 * Opções do Sentry comuns ao navegador, ao servidor e ao edge. Sem DSN, o Sentry não é ligado
 * (desenvolvimento, testes e previews sem a variável). Sem dados pessoais: nada de IP, cookies
 * ou cabeçalhos (`sendDefaultPii: false` + `withoutIp`), sem gravação de tela. Rastreamento de
 * desempenho em 10% (100% em desenvolvimento).
 */
export function sentryOptions(env: Record<string, string | undefined> = process.env) {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV ?? 'development';
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    sendDefaultPii: false,
    tracesSampleRate: environment === 'development' ? 1 : 0.1,
    beforeSend: withoutIp,
  };
}
