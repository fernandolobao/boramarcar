import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * Erros do app no Sentry, com o mesmo cuidado de privacidade do site: sem IP, sem dados
 * pessoais (`sendDefaultPii: false`), sem gravação de tela nem de toques. Só liga quando o DSN
 * existe (`EXPO_PUBLIC_SENTRY_DSN`, configurado no EAS); sem ele, nada é enviado (desenvolvimento,
 * Expo Go sem a variável). Rastreamento de desempenho em 10%.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Tira o IP e cabeçalhos sensíveis do evento antes de enviar. */
export function scrubEvent<
  E extends {
    user?: Record<string, unknown> | null;
    request?: { headers?: Record<string, string> };
  },
>(event: E): E {
  event.user = { ...(event.user ?? {}), ip_address: null };
  const headers = event.request?.headers;
  if (headers) {
    for (const name of Object.keys(headers)) {
      if (/^(cookie|authorization|x-forwarded-for|x-real-ip)$/i.test(name)) delete headers[name];
    }
  }
  return event;
}

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1 : 0.1,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    integrations: [
      Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: !isRunningInExpoGo() }),
    ],
    beforeSend: (event) => scrubEvent(event),
  });
}

export { Sentry };
