import { describe, expect, it, vi } from 'vitest';
import { EXPO_PUSH_URL, isExpoPushToken, sendPush } from './index';

const tok = (n: number) => `ExponentPushToken[abcdefgh${n}]`;

describe('push (Expo)', () => {
  it('reconhece tokens do Expo', () => {
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[xxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoPushToken('fcm:abc')).toBe(false);
  });

  it('manda em lotes de 100 e devolve os tokens que não existem mais', async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const batch = JSON.parse(String(init?.body)) as { to: string }[];
      return Response.json({
        data: batch.map((m) =>
          m.to === tok(5)
            ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
            : { status: 'ok', id: 'x' },
        ),
      });
    });
    const messages = Array.from({ length: 150 }, (_, i) => ({
      to: tok(i),
      title: 'Encontro novo',
      body: 'Sexta, 19h',
    }));
    const result = await sendPush([...messages, { to: 'lixo', title: '', body: '' }], {
      fetch,
      accessToken: 'segredo',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]![0]).toBe(EXPO_PUSH_URL);
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer segredo');
    expect(result).toEqual({ sent: 149, failed: 2, invalidTokens: [tok(5)] });
  });

  it('erro do serviço conta como falha sem derrubar o resto', async () => {
    const fetch = vi.fn(async () => new Response('fora do ar', { status: 503 }));
    const result = await sendPush([{ to: tok(1), title: 'a', body: 'b' }], { fetch });
    expect(result).toEqual({ sent: 0, failed: 1, invalidTokens: [] });
  });
});
