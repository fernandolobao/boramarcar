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
      baseUrl: 'https://www.arcanakin.com.br/',
      getHeaders: async () => ({ Cookie: 'better-auth.session_token=abc' }),
      fetch: fetchMock as unknown as typeof fetch,
    });
    const events = await api.events.list('g 1');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g%201/events?when=upcoming',
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

  it('modo mesa: dados da mesa e registro da partida', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith('/table')
        ? json({
            table: {
              eventId: 'e1',
              title: 'Commander',
              status: 'scheduled',
              defaultFormat: 'commander',
              players: [{ userId: 'u1', name: 'Ana', confirmed: true, decks: [] }],
            },
          })
        : json({ game: { id: 'g1', number: 1 } }, 201),
    );
    const api = createApiClient({
      baseUrl: 'https://x.dev',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const table = await api.table.get('e1');
    expect(table.players[0]).toMatchObject({ name: 'Ana', confirmed: true });
    const game = await api.games.record('e1', {
      format: 'commander',
      players: [
        { userId: 'u1', result: 'win' },
        { userId: 'u2', result: 'loss', eliminatedOrder: 1 },
      ],
    });
    expect(game.id).toBe('g1');
    expect(fetchMock.mock.calls[1]![0]).toBe('https://x.dev/api/v1/events/e1/games');
    expect(fetchMock.mock.calls[1]![1]!.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]!.body)).players).toHaveLength(2);
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

  it('disponibilidade: lista, cria, remove, regras, exceções e melhores horários', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/availability/windows')) {
        return json({
          windows: [
            {
              start: '2026-11-14T22:00:00.000Z',
              end: '2026-11-15T02:00:00.000Z',
              durationMinutes: 240,
              userIds: ['a', 'b'],
              locationId: null,
              locationName: null,
              players: [
                { userId: 'a', name: 'Ana' },
                { userId: 'b', name: 'Bia' },
              ],
            },
          ],
        });
      }
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/availability-rules') && init?.method === 'POST') {
        return json({ rules: [{ id: 'r1' }] }, 201);
      }
      if (url.endsWith('/exceptions')) return json({ date: '2026-11-19', skip: true });
      return json({
        slots: [
          {
            id: 'r1:2026-11-19',
            userId: 'a',
            userName: 'Ana',
            startsAt: '2026-11-19T22:00:00.000Z',
            endsAt: '2026-11-20T02:00:00.000Z',
            note: null,
            kind: 'weekly',
            ruleId: 'r1',
            date: '2026-11-19',
            locationIds: [],
          },
        ],
      });
    });
    const api = createApiClient({
      baseUrl: 'https://x.dev',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const slots = await api.availability.list('g1', { from: new Date('2026-11-01T00:00:00Z') });
    expect(calls[0]!.url).toBe(
      'https://x.dev/api/v1/groups/g1/availability?from=2026-11-01T00%3A00%3A00.000Z',
    );
    expect(slots[0]!.startsAt).toEqual(new Date('2026-11-19T22:00:00.000Z'));
    const windows = await api.availability.windows('g1');
    expect(windows[0]!.players.map((p) => p.name)).toEqual(['Ana', 'Bia']);
    await api.availability.remove('s 1');
    expect(calls[2]!.url).toBe('https://x.dev/api/v1/availability/s%201');
    await api.rules.add('g1', {
      weekdays: [4],
      startTime: '19:00',
      endTime: '23:00',
      timeZone: 'America/Sao_Paulo',
    });
    expect(JSON.parse(String(calls[3]!.init!.body))).toMatchObject({ weekdays: [4] });
    await api.rules.setException('r1', '2026-11-19', true);
    expect(calls[4]!.init!.method).toBe('PUT');
  });

  it('deck: linhas com a carta e a análise', async () => {
    const fetchMock = vi.fn(async () =>
      json({
        deck: {
          id: 'd1',
          name: 'Omnath',
          format: 'commander',
          visibility: 'group',
          ownerName: 'Ana',
          isOwner: true,
          ownerId: 'u1',
          lines: [
            {
              key: 'commander|omnath|x',
              name: 'Omnath, Locus of Creation',
              board: 'commander',
              quantity: 1,
              proxies: 0,
              scryfallId: 'x',
              card: {
                scryfallId: 'x',
                name: 'Omnath, Locus of Creation',
                cmc: 4,
                typeLine: 'Legendary Creature — Elemental',
                imageUri: 'https://cards.scryfall.io/x.jpg',
                colors: ['R', 'G', 'W', 'U'],
              },
              ids: ['e1'],
            },
          ],
          analysis: {
            totalCards: 100,
            commanders: ['Omnath, Locus of Creation'],
            colorIdentity: ['W', 'U', 'R', 'G'],
            lands: 37,
            averageCmc: 3.1,
            manaCurve: { '0': 0, '1': 8 },
            roles: { ramp: 11 },
            proxies: 3,
            gameChangers: [],
            score: 82,
            validation: [{ code: 'banned', name: 'X' }],
          },
          bracket: { minimum: 3, reasons: [] },
        },
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://x.dev',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const deck = await api.decks.get('d1');
    expect(deck.lines[0]!.card?.typeLine).toContain('Creature');
    expect(deck.analysis.score).toBe(82);
    expect(deck.analysis.validation[0]).toMatchObject({ code: 'banned', name: 'X' });
  });
});
