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

  it('exclusão da conta (LGPD): prévia dos grupos e DELETE com confirmação', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? json({ deleted: true, transferredGroups: ['g1'], deletedGroups: [] })
        : json({ deletion: { transfers: ['Mesa'], deletions: [] } }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await api.me.deletionPreview()).toEqual({ transfers: ['Mesa'], deletions: [] });
    await expect(api.me.deleteAccount()).resolves.toMatchObject({ deleted: true });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://www.arcanakin.com.br/api/v1/me');
    expect(init).toMatchObject({ method: 'DELETE', body: JSON.stringify({ confirm: true }) });
  });

  it('liga e desliga o push do aparelho', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? json({ removed: true }) : json({ registered: true }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await api.me.registerPushToken('ExponentPushToken[abcdefgh1]', 'android');
    await api.me.removePushToken('ExponentPushToken[abcdefgh1]');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://www.arcanakin.com.br/api/v1/me/push-tokens');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[abcdefgh1]', platform: 'android' }),
    });
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' });
  });

  it('histórico de encontros com filtros e membros do grupo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          history: {
            page: 2,
            pageSize: 20,
            total: 21,
            pages: 2,
            items: [
              {
                id: 'e9',
                title: 'Commander na casa',
                startsAt: '2026-10-01T22:00:00.000Z',
                status: 'finished',
                locationName: 'Casa da Ana',
                games: 2,
                attendees: 4,
                winners: ['Bia'],
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        json({ members: [{ userId: 'u1', name: 'Ana', image: null, role: 'owner' }] }),
      );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const history = await api.events.history('g1', {
      q: 'casa',
      status: 'finished',
      playerId: 'u2',
      page: 2,
    });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/events/history?q=casa&status=finished&playerId=u2&page=2',
    );
    expect(history.items[0]).toMatchObject({ winners: ['Bia'], games: 2 });
    expect(history.items[0]!.startsAt).toBeInstanceOf(Date);
    const members = await api.groups.members('g1');
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/members',
    );
    expect(members[0]).toMatchObject({ name: 'Ana', role: 'owner' });
  });

  it('perfil do jogador: datas convertidas e conquistas tipadas', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      json({
        player: {
          id: 'u2',
          name: 'Bia',
          image: null,
          email: null,
          isSelf: false,
          memberSince: '2026-01-10T00:00:00.000Z',
          games: 12,
          wins: 4,
          winRate: 0.3333,
          groups: [{ id: 'g1', name: 'Mesa de Terça', role: 'member' }],
          decks: [],
          achievements: [
            {
              id: 'first_win',
              unlocked: true,
              unlockedAt: '2026-02-01T00:00:00.000Z',
              progress: 1,
              target: 1,
              count: 4,
            },
            { id: 'games_50', unlocked: false, unlockedAt: null, progress: 12, target: 50 },
            // Conquista criada depois desta versão do app: ignorada, sem derrubar o perfil.
            { id: 'futura', unlocked: true, unlockedAt: null, progress: 1, target: 1 },
          ],
          seasonTitles: [
            { seasonName: 'T1', groupName: 'Mesa de Terça', endsAt: '2026-03-31T00:00:00.000Z' },
          ],
        },
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const player = await api.players.get('u2');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://www.arcanakin.com.br/api/v1/players/u2');
    expect(player.memberSince).toBeInstanceOf(Date);
    expect(player.achievements[0]!.unlockedAt).toBeInstanceOf(Date);
    expect(player.achievements[1]).toMatchObject({ unlocked: false, progress: 12 });
    expect(player.achievements).toHaveLength(2);
    expect(player.seasonTitles[0]!.endsAt).toBeInstanceOf(Date);
  });

  it('conquistas novas: lista (ignorando as desconhecidas) e marca as vistas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          achievements: [
            {
              id: 'streak_3',
              unlocked: true,
              unlockedAt: '2026-11-17T22:00:00.000Z',
              progress: 3,
              target: 3,
            },
            { id: 'futura', unlocked: true, unlockedAt: null, progress: 1, target: 1 },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const list = await api.me.newAchievements();
    expect(list.map((a) => a.id)).toEqual(['streak_3']);
    expect(list[0]!.unlockedAt).toBeInstanceOf(Date);
    await api.me.markAchievementsSeen(['streak_3']);
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/me/achievements/seen',
    );
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ ids: ['streak_3'] }),
    });
  });

  it('central de notificações: lista com datas e marca como lidas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          unread: 1,
          items: [
            {
              id: 'n1',
              kind: 'game',
              data: { kind: 'game', eventId: 'e1', result: 'win', winnerIds: ['u1'] },
              createdAt: '2026-11-18T11:00:00.000Z',
              readAt: null,
              groupName: 'Mesa',
              eventTitle: 'Noite',
              people: { u1: 'Ana' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const inbox = await api.me.notifications();
    expect(inbox.unread).toBe(1);
    expect(inbox.items[0]!.createdAt).toBeInstanceOf(Date);
    await api.me.markNotificationsRead();
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/me/notifications/read',
    );
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.me.markNotificationRead('n1');
    expect(fetchMock.mock.calls[2]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/me/notifications/n1/read',
    );
  });

  it('torneios: página com datas convertidas e as ações nas rotas certas', async () => {
    const view = {
      tournament: {
        id: 't1',
        groupId: 'g1',
        eventId: 'e1',
        name: 'Copa',
        format: 'modern',
        table: 'pair',
        entrantSize: 1,
        bestOf: 3,
        rounds: 3,
        status: 'running',
        countsInRanking: true,
        createdAt: '2026-11-19T10:00:00.000Z',
      },
      event: { title: 'Noite', startsAt: '2026-11-20T22:00:00.000Z' },
      canManage: true,
      myEntrantId: 'x1',
      entrants: [{ id: 'x1', name: 'Ana', memberIds: ['u1'] }],
      rounds: [
        {
          id: 'r1',
          number: 1,
          tables: [
            { id: 'tb1', number: 1, entrants: ['x1'], gameWins: {}, gameDraws: 0, reported: true },
          ],
        },
      ],
      standings: [
        {
          entrant: 'x1',
          points: 3,
          wins: 0,
          draws: 0,
          losses: 0,
          byes: 1,
          omw: 0,
          gw: 1,
          ogw: 0,
          rank: 1,
        },
      ],
      timeline: [{ kind: 'started', data: {}, createdAt: '2026-11-19T10:00:00.000Z' }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(view))
      .mockResolvedValueOnce(json({ reported: true }))
      .mockResolvedValueOnce(json({ tournaments: [] }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const got = await api.tournaments.get('t1');
    expect(got.tournament.createdAt).toBeInstanceOf(Date);
    expect(got.timeline[0]!.createdAt).toBeInstanceOf(Date);
    await api.tournaments.report('t1', 'tb1', { gameWins: { x1: 2 }, gameDraws: 0 });
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/tournaments/t1/tables/tb1',
    );
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PUT' });
    await api.tournaments.list('g1');
    expect(fetchMock.mock.calls[2]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/tournaments',
    );
  });

  it('torneio de loja: sem grupo nem encontro, com convidado', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        tournament: {
          id: 't2',
          groupId: null,
          eventId: null,
          storeEventId: 'se1',
          name: 'Copa da loja',
          format: 'modern',
          table: 'pair',
          entrantSize: 1,
          bestOf: 3,
          rounds: 3,
          status: 'running',
          countsInRanking: false,
          createdAt: '2026-11-19T10:00:00.000Z',
        },
        event: { title: 'Copa da loja', startsAt: '2026-11-27T22:00:00.000Z' },
        canManage: false,
        myEntrantId: null,
        entrants: [{ id: 'x2', name: 'Zé', memberIds: [], guest: true }],
        rounds: [],
        standings: [],
        timeline: [],
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const got = await api.tournaments.get('t2');
    expect(got.tournament.groupId).toBeNull();
    expect(got.tournament.storeEventId).toBe('se1');
  });

  it('lojas: perfil, evento (com a minha inscrição), código e os meus eventos', async () => {
    const event = {
      id: 'se1',
      storeId: 's1',
      title: 'Commander de sexta',
      startsAt: '2026-11-27T22:00:00.000Z',
      endsAt: null,
      format: 'commander',
      kind: 'tournament',
      capacity: 8,
      prizes: null,
      rules: null,
      status: 'scheduled',
      createdAt: '2026-11-19T10:00:00.000Z',
      store: { name: 'Loja do Mago', slug: 'loja-do-mago' },
      registered: 3,
      waitlist: 0,
      myEntry: { id: 'en1', status: 'registered' },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ event, tournamentId: null }))
      .mockResolvedValueOnce(
        json({ entry: { id: 'en2', eventId: 'se1', slug: 'loja-do-mago', status: 'waitlist' } }),
      )
      .mockResolvedValueOnce(
        json({
          entries: [
            {
              entryId: 'en1',
              status: 'registered',
              event: {
                id: 'se1',
                title: 'X',
                startsAt: '2026-11-27T22:00:00.000Z',
                format: 'commander',
                kind: 'casual',
              },
              store: { name: 'Loja do Mago', slug: 'loja-do-mago' },
            },
          ],
        }),
      );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const got = await api.storeEvents.get('se1');
    expect(got.event.startsAt).toBeInstanceOf(Date);
    expect(got.event.myEntry).toEqual({ id: 'en1', status: 'registered' });
    const entry = await api.storeEvents.byCode('abc123');
    expect(entry).toMatchObject({ status: 'waitlist', slug: 'loja-do-mago' });
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/store-events/by-code',
    );
    const mine = await api.storeEvents.mine();
    expect(mine[0]!.event.startsAt).toBeInstanceOf(Date);
  });

  it('recordes do grupo: datas convertidas e recordes vazios aceitos', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        totalGames: 2,
        records: {
          fastestWin: {
            gameId: 'g1',
            eventId: 'e1',
            playedAt: '2026-11-12T23:00:00.000Z',
            turn: 4,
            winnerIds: ['u1'],
          },
          longestGame: null,
          longestStreak: null,
          busiestNight: { eventId: 'e1', playedAt: '2026-11-12T23:00:00.000Z', games: 2 },
          topCommander: null,
        },
        face: { colors: { W: 0, U: 0, B: 0, R: 0, G: 2, C: 0 }, commanders: 1, meta: [] },
        people: { u1: 'Ana' },
        eventTitles: { e1: 'Noite' },
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const view = await api.stats.records('g1');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/records',
    );
    expect(view.records.fastestWin!.playedAt).toBeInstanceOf(Date);
    expect(view.records.longestGame).toBeNull();
  });

  it('grupo: convite novo, papéis, remoção, posse e locais', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ inviteCode: 'NOVO1234' }))
      .mockResolvedValueOnce(json({ role: 'admin' }))
      .mockResolvedValueOnce(json({ groupDeleted: false }))
      .mockResolvedValueOnce(json({ ownerId: 'u2' }))
      .mockResolvedValueOnce(json({ location: { id: 'l1', name: 'Loja', address: null } }, 201))
      .mockResolvedValueOnce(json({ deleted: true }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await api.groups.regenerateInvite('g1')).toBe('NOVO1234');
    expect(await api.groups.setRole('g1', 'u2', 'admin')).toEqual({ role: 'admin' });
    expect(await api.groups.removeMember('g1', 'u3')).toEqual({ groupDeleted: false });
    expect(await api.groups.transfer('g1', 'u2')).toEqual({ ownerId: 'u2' });
    expect(await api.locations.create('g1', { name: 'Loja' })).toMatchObject({ id: 'l1' });
    expect(await api.locations.remove('g1', 'l1')).toEqual({ deleted: true });
    const calls = (fetchMock.mock.calls as [string, RequestInit][]).map(
      (c) => `${c[1].method} ${c[0].replace('https://www.arcanakin.com.br/api/v1', '')}`,
    );
    expect(calls).toEqual([
      'POST /groups/g1/invite',
      'PATCH /groups/g1/members/u2',
      'DELETE /groups/g1/members/u3',
      'POST /groups/g1/transfer',
      'POST /groups/g1/locations',
      'DELETE /groups/g1/locations/l1',
    ]);
    expect(JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body))).toEqual({
      role: 'admin',
    });
  });

  it('preferências: lê e salva fuso, idioma e avisos por e-mail', async () => {
    const prefs = { timeZone: 'America/Sao_Paulo', locale: 'pt-BR', emailNotifications: true };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ preferences: prefs }))
      .mockResolvedValueOnce(json({ preferences: { ...prefs, emailNotifications: false } }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await api.me.preferences()).toEqual(prefs);
    const saved = await api.me.updatePreferences({ emailNotifications: false });
    expect(saved.emailNotifications).toBe(false);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://www.arcanakin.com.br/api/v1/me/preferences');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ emailNotifications: false });
  });

  it('estatísticas do grupo', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      json({
        stats: {
          totalGames: 3,
          averageWinningTurn: 8.5,
          players: [
            {
              userId: 'u1',
              name: 'Ana',
              games: 3,
              wins: 2,
              currentStreak: 2,
              bestStreak: 2,
              recent: ['win', 'win', 'loss'],
            },
          ],
          commanders: [
            {
              name: 'Omnath',
              games: 2,
              wins: 1,
              winRate: 0.5,
              artUri: null,
              players: [{ userId: 'u1', name: 'Ana' }],
            },
          ],
          activity: [{ month: '2026-11', games: 3 }],
          headToHead: [],
        },
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const stats = await api.stats.get('g1');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://www.arcanakin.com.br/api/v1/groups/g1/stats');
    expect(stats.commanders[0]).toMatchObject({ name: 'Omnath', winRate: 0.5 });
    expect(stats.players[0]!.recent).toEqual(['win', 'win', 'loss']);
  });

  it('edita o encontro e apaga uma partida (resposta vazia)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ event: { id: 'e1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await api.events.update('e1', {
      title: 'Commander',
      startsAt: new Date('2026-11-20T22:00:00.000Z'),
      endsAt: null,
      locationId: 'l1',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.arcanakin.com.br/api/v1/events/e1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({
      title: 'Commander',
      startsAt: '2026-11-20T22:00:00.000Z',
      endsAt: null,
      locationId: 'l1',
    });
    await expect(api.games.remove('g1')).resolves.toBeNull();
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[1].method).toBe('DELETE');
  });

  it('deck: importar, configurar, sincronizar, exportar texto e apagar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ deck: { id: 'd1' }, notFound: ['Carta Inventada'] }, 201))
      .mockResolvedValueOnce(json({ deck: { id: 'd1', visibility: 'public' } }))
      .mockResolvedValueOnce(json({ added: ['Sol Ring'], removed: [], changed: ['Forest'] }))
      .mockResolvedValueOnce(new Response('1 Sol Ring\n31 Forest', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const imported = await api.decks.import({ kind: 'text', text: '1 Sol Ring', name: 'Teste' });
    expect(imported).toEqual({ deck: { id: 'd1' }, notFound: ['Carta Inventada'] });
    expect(await api.decks.update('d1', { visibility: 'public' })).toMatchObject({ id: 'd1' });
    expect(await api.decks.sync('d1')).toMatchObject({ added: ['Sol Ring'] });
    expect(await api.decks.exportText('d1', 'proxies')).toBe('1 Sol Ring\n31 Forest');
    await expect(api.decks.remove('d1')).resolves.toBeNull();
    const calls = (fetchMock.mock.calls as [string, RequestInit][]).map(
      (c) => `${c[1].method ?? 'GET'} ${c[0].replace('https://www.arcanakin.com.br/api/v1', '')}`,
    );
    expect(calls).toEqual([
      'POST /decks',
      'PATCH /decks/d1',
      'POST /decks/d1/sync',
      'GET /decks/d1/export?format=proxies',
      'DELETE /decks/d1',
    ]);
    expect(JSON.parse(String((fetchMock.mock.calls[2] as [string, RequestInit])[1].body))).toEqual(
      {},
    );
  });

  it('coleção: lista, sugestões, adicionar, editar e remover', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          cards: [
            {
              id: 'c1',
              name: 'Sol Ring',
              scryfallId: 's1',
              quantity: 2,
              foil: false,
              card: {
                scryfallId: 's1',
                name: 'Sol Ring',
                cmc: 1,
                typeLine: 'Artifact',
                priceUsd: '1.50',
              },
              addedAt: '2026-11-01T00:00:00.000Z',
              decks: [{ deckId: 'd1', deckName: 'Omnath', quantity: 1, proxies: 0 }],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(json({ names: ['Sol Ring', 'Solemn Simulacrum'] }))
      .mockResolvedValueOnce(json({ added: true, name: 'Sol Ring' }, 201))
      .mockResolvedValueOnce(json({ updated: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const cards = await api.collection.list();
    expect(cards[0]!.addedAt).toBeInstanceOf(Date);
    expect(cards[0]!.decks[0]).toMatchObject({ deckName: 'Omnath' });
    expect(await api.cards.autocomplete('sol')).toEqual([
      { name: 'Sol Ring', printedName: null },
      { name: 'Solemn Simulacrum', printedName: null },
    ]);
    expect(await api.collection.add({ name: 'Sol Ring', quantity: 1 })).toEqual({
      added: true,
      name: 'Sol Ring',
    });
    await api.collection.update('c1', { quantity: 3 });
    await expect(api.collection.remove('c1')).resolves.toBeNull();
    const calls = (fetchMock.mock.calls as [string, RequestInit][]).map(
      (c) => `${c[1].method ?? 'GET'} ${c[0].replace('https://www.arcanakin.com.br/api/v1', '')}`,
    );
    expect(calls).toEqual([
      'GET /collection',
      'GET /cards/autocomplete?q=sol',
      'POST /collection',
      'PATCH /collection/c1',
      'DELETE /collection/c1',
    ]);
  });

  it('configurações do grupo e temporadas', async () => {
    const settings = {
      tableSize: 4,
      minDurationMinutes: 180,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      defaultFormat: 'commander',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ settings }))
      .mockResolvedValueOnce(json({ settings: { ...settings, tableSize: 5 } }))
      .mockResolvedValueOnce(
        json({
          seasons: [
            {
              id: 's1',
              name: 'T1',
              startsAt: '2026-01-01T03:00:00.000Z',
              endsAt: '2026-04-01T03:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json(
          {
            season: {
              id: 's2',
              name: 'T2',
              startsAt: '2026-04-01T03:00:00.000Z',
              endsAt: '2026-07-01T03:00:00.000Z',
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await api.groups.settings('g1')).toEqual(settings);
    expect((await api.groups.updateSettings('g1', { tableSize: 5 })).tableSize).toBe(5);
    const seasons = await api.seasons.list('g1');
    expect(seasons[0]!.startsAt).toBeInstanceOf(Date);
    const created = await api.seasons.create('g1', {
      name: 'T2',
      startsAt: new Date('2026-04-01T03:00:00.000Z'),
      endsAt: new Date('2026-07-01T03:00:00.000Z'),
    });
    expect(created.id).toBe('s2');
    await expect(api.seasons.remove('s1')).resolves.toBeNull();
    const calls = (fetchMock.mock.calls as [string, RequestInit][]).map(
      (c) => `${c[1].method ?? 'GET'} ${c[0].replace('https://www.arcanakin.com.br/api/v1', '')}`,
    );
    expect(calls).toEqual([
      'GET /groups/g1/settings',
      'PATCH /groups/g1/settings',
      'GET /groups/g1/seasons',
      'POST /groups/g1/seasons',
      'DELETE /seasons/s1',
    ]);
  });

  it('editar cartas do deck, edições e editar partida', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ line: { name: 'Sol Ring' }, found: true }))
      .mockResolvedValueOnce(json({ line: { name: 'Forest' }, found: true }))
      .mockResolvedValueOnce(
        json({
          prints: [
            {
              scryfallId: 'p1',
              name: 'Sol Ring',
              setCode: 'cmm',
              setName: 'Commander Masters',
              collectorNumber: '400',
              imageUri: null,
              priceUsd: '1.50',
              artist: 'Mike Bierek',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(json({ moved: true }))
      .mockResolvedValueOnce(json({ game: { id: 'g1' } }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(
      await api.decks.setLine('d1', {
        name: 'Sol Ring',
        board: 'mainboard',
        quantity: 1,
        proxies: 0,
      }),
    ).toMatchObject({ found: true });
    expect(
      await api.decks.addCard('d1', {
        name: 'Forest',
        board: 'mainboard',
        quantity: 2,
        proxies: 0,
      }),
    ).toMatchObject({ found: true });
    expect((await api.cards.prints('Sol Ring'))[0]).toMatchObject({
      setCode: 'cmm',
      artist: 'Mike Bierek',
    });
    await api.decks.changePrint('d1', {
      name: 'Sol Ring',
      board: 'mainboard',
      fromScryfallId: null,
      toScryfallId: 'p1',
      quantity: 1,
    });
    expect(await api.games.update('g1', { players: [{ userId: 'u1', result: 'win' }] })).toEqual({
      id: 'g1',
    });
    const calls = (fetchMock.mock.calls as [string, RequestInit][]).map(
      (c) => `${c[1].method ?? 'GET'} ${c[0].replace('https://www.arcanakin.com.br/api/v1', '')}`,
    );
    expect(calls).toEqual([
      'PUT /decks/d1/lines',
      'POST /decks/d1/lines',
      'GET /cards/prints?name=Sol+Ring&v=2',
      'POST /decks/d1/lines/print',
      'PUT /games/g1',
    ]);
  });

  it('pares do encontro (sugestão de mesas)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        format: 'commander',
        players: [
          { userId: 'u1', name: 'Ana' },
          { userId: 'u2', name: 'Bia' },
        ],
        pairs: [{ a: 'u1', b: 'u2', recent: 1, older: 2 }],
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await api.events.pairings('e 1');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/events/e%201/pairings',
    );
    expect(result.pairs[0]).toEqual({ a: 'u1', b: 'u2', recent: 1, older: 2 });
  });

  it('com quem você ainda não jogou', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        hints: [
          { userId: 'u2', name: 'Bia', lastPlayedAt: null, confirmedNext: true },
          {
            userId: 'u3',
            name: 'Caio',
            lastPlayedAt: '2026-09-01T22:00:00.000Z',
            confirmedNext: false,
          },
        ],
      }),
    );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const hints = await api.groups.partners('g1');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/partners',
    );
    expect(hints[0]!.lastPlayedAt).toBeNull();
    expect(hints[1]!.lastPlayedAt).toBeInstanceOf(Date);
  });

  it('presença do grupo e chamar para o próximo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          members: [
            {
              userId: 'u2',
              name: 'Bia',
              attended: 1,
              of: 8,
              lastGameAt: null,
              awaySince: '2026-09-01T22:00:00.000Z',
            },
          ],
          nextEvent: { id: 'e1', title: 'Quinta', startsAt: '2026-11-20T22:30:00.000Z' },
          nudged: [],
          confirmedNext: ['u1'],
        }),
      )
      .mockResolvedValueOnce(json({ nudged: true }));
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const attendance = await api.groups.attendance('g1');
    expect(attendance.members[0]!.awaySince).toBeInstanceOf(Date);
    expect(attendance.nextEvent!.startsAt).toBeInstanceOf(Date);
    await api.groups.nudge('g1', 'u2', 'e1');
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://www.arcanakin.com.br/api/v1/groups/g1/members/u2/nudge',
    );
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ eventId: 'e1' });
  });

  it('estado do guia do primeiro acesso', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ guide: { show: true, done: false, hasGroup: false }, tips: [] }),
      )
      .mockResolvedValueOnce(json({ flag: 'guide-completed' }))
      .mockResolvedValueOnce(
        json({ guide: { show: false, done: true, hasGroup: true }, tips: ['table'] }),
      );
    const api = createApiClient({
      baseUrl: 'https://www.arcanakin.com.br',
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await api.me.onboarding()).toEqual({ show: true, done: false, hasGroup: false });
    await api.me.markOnboarding('guide-completed');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ flag: 'guide-completed' });
    expect(await api.me.dismissedTips()).toEqual(['table']);
  });
});
