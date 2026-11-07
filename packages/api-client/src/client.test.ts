import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './index';

const json = (body: unknown, status = 200) => Response.json(body, { status });

describe('cliente da API', () => {
  it('monta a URL, envia o cookie da sessão e converte datas', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      json({
        events: [
          {
            id: 'e1',
            title: 'Commander',
            startsAt: '2026-11-14T22:00:00.000Z',
            endsAt: null,
            status: 'scheduled',
            locationName: 'Casa da Ana',
            locationId: 'l1',
          },
        ],
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://boramarcar.vercel.app/',
      getHeaders: async () => ({ Cookie: 'better-auth.session_token=abc' }),
      fetch: fetchMock as unknown as typeof fetch,
    });
    const events = await api.events.list('g 1');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://boramarcar.vercel.app/api/v1/groups/g%201/events?when=upcoming',
    );
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.headers).toMatchObject({ Cookie: 'better-auth.session_token=abc' });
    expect(init.credentials).toBe('omit');
    expect(events[0]!.startsAt).toEqual(new Date('2026-11-14T22:00:00.000Z'));
    expect(events[0]).toMatchObject({ locationId: 'l1' });
  });

  it('envia o corpo em JSON e traduz erros da API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ rsvp: 'maybe' }))
      .mockResolvedValueOnce(
        json({ error: { code: 'forbidden', message: 'Você não participa' } }, 403),
      )
      .mockResolvedValueOnce(new Response('oops', { status: 500 }))
      .mockResolvedValueOnce(json({ decks: [{ id: 1 }] }))
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    const api = createApiClient({ baseUrl: 'http://x', fetch: fetchMock });

    expect(await api.events.rsvp('e1', 'maybe')).toBe('maybe');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: 'PUT',
      body: '{"rsvp":"maybe"}',
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(api.groups.list()).rejects.toMatchObject({ code: 'forbidden', status: 403 });
    await expect(api.groups.list()).rejects.toMatchObject({ code: 'internal_error', status: 500 });
    await expect(api.decks.list()).rejects.toMatchObject({ code: 'invalid_response' });
    const offline = await api.groups.list().catch((e: unknown) => e);
    expect(offline).toBeInstanceOf(ApiError);
    expect(offline).toMatchObject({ code: 'network_error', status: 0 });
  });

  it('ranking com filtros e detalhe do encontro', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          totalGames: 1,
          points: { win: 3 },
          standings: [
            {
              userId: 'a',
              name: 'Ana',
              image: null,
              position: 1,
              games: 1,
              wins: 1,
              losses: 0,
              draws: 0,
              points: 3,
              winRate: 1,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          event: {
            id: 'e1',
            groupId: 'g',
            title: 'Commander',
            startsAt: '2026-11-14T22:00:00.000Z',
            endsAt: null,
            status: 'finished',
            canManage: true,
            location: null,
            participants: [{ userId: 'a', name: 'Ana', image: null, rsvp: 'yes' }],
            games: [
              {
                id: 'g1',
                number: 1,
                format: 'commander',
                isDraw: false,
                winners: [{ userId: 'a', name: 'Ana' }],
                players: [{ userId: 'a', name: 'Ana', result: 'win', deckName: 'Omnath' }],
              },
            ],
          },
        }),
      );
    const api = createApiClient({ baseUrl: 'http://x', fetch: fetchMock });
    const ranking = await api.ranking.get('g', {
      from: new Date('2026-01-01T00:00:00Z'),
      format: 'commander',
    });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'http://x/api/v1/groups/g/ranking?from=2026-01-01T00%3A00%3A00.000Z&format=commander',
    );
    expect(ranking.standings[0]!.name).toBe('Ana');
    const event = await api.events.get('e1');
    expect(event.games[0]!.winners[0]!.name).toBe('Ana');
  });

  it('desiste do pedido depois do tempo máximo (erro de conexão)', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init!.signal!.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const api = createApiClient({
      baseUrl: 'https://x.dev',
      fetch: fetchMock as unknown as typeof fetch,
      timeoutMs: 20,
    });
    await expect(api.decks.list()).rejects.toMatchObject({ code: 'network_error' });
  });
});
