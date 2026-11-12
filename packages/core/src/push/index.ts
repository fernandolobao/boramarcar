import type { FetchLike } from '../decks/types';
import { EXTERNAL_TIMEOUT_MS, withTimeout } from '../external';

/**
 * Notificações push pelo serviço do Expo (https://docs.expo.dev/push-notifications/sending-notifications/).
 * O app mobile registra um "ExponentPushToken[…]" por aparelho; o servidor manda as mensagens
 * em lotes de até 100. Tokens que o Expo diz não existirem mais (`DeviceNotRegistered`) voltam
 * em `invalidTokens`, para serem apagados.
 */
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  /** Dados para o app abrir a tela certa ao tocar (ex.: { url: '/encontros/123' }). */
  data?: Record<string, string>;
  /** Canal do Android (criado pelo app). */
  channelId?: string;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

interface Ticket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/** Formato de token do Expo: evita mandar lixo (ou tokens de outro serviço) para a API. */
export const isExpoPushToken = (token: string) =>
  /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$/.test(token);

export async function sendPush(
  messages: readonly PushMessage[],
  options: { fetch: FetchLike; accessToken?: string },
): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, failed: 0, invalidTokens: [] };
  const valid = messages.filter((m) => isExpoPushToken(m.to));
  result.failed += messages.length - valid.length;
  const send = withTimeout(options.fetch, EXTERNAL_TIMEOUT_MS.push, 'Expo Push');
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    try {
      const response = await send(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        },
        body: JSON.stringify(
          batch.map((m) => ({ ...m, sound: 'default', channelId: m.channelId ?? 'default' })),
        ),
      });
      if (!response.ok) {
        result.failed += batch.length;
        continue;
      }
      const body = (await response.json().catch(() => ({}))) as { data?: Ticket[] };
      batch.forEach((message, index) => {
        const ticket = body.data?.[index];
        if (ticket?.status === 'ok') result.sent += 1;
        else {
          result.failed += 1;
          if (ticket?.details?.error === 'DeviceNotRegistered') {
            result.invalidTokens.push(message.to);
          }
        }
      });
    } catch {
      result.failed += batch.length;
    }
  }
  return result;
}
