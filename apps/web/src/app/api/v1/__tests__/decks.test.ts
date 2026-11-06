import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const decks = await import('../decks/route');
const deck = await import('../decks/[deckId]/route');
const deckCard = await import('../decks/[deckId]/cards/[cardId]/route');
const lines = await import('../decks/[deckId]/lines/route');
const sync = await import('../decks/[deckId]/sync/route');
const exportRoute = await import('../decks/[deckId]/export/route');
const autocomplete = await import('../cards/autocomplete/route');
const proxiesPdf = await import('../decks/[deckId]/proxies/route');
const linePrint = await import('../decks/[deckId]/lines/print/route');
const prints = await import('../cards/prints/route');

let close: () => Promise<void>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => vi.unstubAllGlobals());

const scryfall = (name: string, extra: Record<string, unknown> = {}) => ({
  id: `${name.toLowerCase().replace(/\W+/g, '-')}-id`,
  name,
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  ...extra,
});

/** Simula Archidekt e Scryfall. */
function stubExternalApis() {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('https://archidekt.com/api/decks/42/')) {
      return Response.json({
        id: 42,
        name: 'Omnath Ramp',
        categories: [{ name: 'Commander', includedInDeck: true }],
        cards: [
          {
            quantity: 1,
            categories: ['Commander'],
            card: { oracleCard: { name: 'Omnath, Locus of Mana' } },
          },
          { quantity: 1, categories: ['Ramp'], card: { oracleCard: { name: 'Sol Ring' } } },
          { quantity: 30, categories: ['Land'], card: { oracleCard: { name: 'Forest' } } },
        ],
      });
    }
    if (url === 'https://api.scryfall.com/cards/collection') {
      const { identifiers } = JSON.parse(String(init?.body)) as { identifiers: { name: string }[] };
      return Response.json({
        data: identifiers
          .filter((i) => i.name !== 'Carta Fantasma')
          .map((i) =>
            i.name === 'Forest'
              ? scryfall('Forest', {
                  type_line: 'Basic Land — Forest',
                  cmc: 0,
                  color_identity: ['G'],
                })
              : i.name.startsWith('Omnath')
                ? scryfall(i.name, {
                    type_line: 'Legendary Creature',
                    mana_cost: '{2}{G}',
                    cmc: 3,
                    color_identity: ['G'],
                  })
                : scryfall(i.name, { oracle_text: '{T}: Add {C}{C}.' }),
          ),
        not_found: identifiers.filter((i) => i.name === 'Carta Fantasma'),
      });
    }
    if (url.startsWith('https://api.scryfall.com/cards/autocomplete')) {
      return Response.json({ data: ['Sol Ring', 'Solemn Simulacrum'] });
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('API v1 — decks', () => {
  it('importa por URL do Archidekt, analisa e marca proxy', async () => {
    const owner = await createTestUser(testState.db!, { name: 'Dono' });
    asUser(owner);
    const fetchMock = stubExternalApis();

    const imported = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'url', url: 'https://archidekt.com/decks/42/omnath' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body!.notFound).toEqual([]);
    const deckId = imported.body!.deck.id as string;

    const detail = await call(deck.GET, { params: { deckId } });
    expect(detail.body!.deck.analysis).toMatchObject({
      totalCards: 32,
      lands: 30,
      commanders: ['Omnath, Locus of Mana'],
    });

    const solRing = detail.body!.deck.entries.find((e: { name: string }) => e.name === 'Sol Ring');
    const patched = await call(deckCard.PATCH, {
      method: 'PATCH',
      params: { deckId, cardId: solRing.id },
      body: { isProxy: true },
    });
    expect(patched.body!.card.isProxy).toBe(true);

    const list = await call(decks.GET);
    expect(list.body!.decks[0]).toMatchObject({ name: 'Omnath Ramp', proxyCount: 1 });

    // Segunda importação usa o cache local: Scryfall não é chamado de novo
    fetchMock.mockClear();
    await call(decks.POST, {
      method: 'POST',
      body: { kind: 'text', name: 'Cópia', text: '1 Sol Ring\n30 Forest' },
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const renamed = await call(deck.PATCH, {
      method: 'PATCH',
      params: { deckId },
      body: { name: 'Omnath Brawl', format: 'brawl' },
    });
    expect(renamed.body!.deck).toMatchObject({ name: 'Omnath Brawl', format: 'brawl' });
    expect(
      (await call(deck.PATCH, { method: 'PATCH', params: { deckId }, body: { format: 'xyz' } }))
        .status,
    ).toBe(400);
    const stranger = await createTestUser(testState.db!, { name: 'Outro' });
    asUser(stranger);
    expect(
      (await call(deck.PATCH, { method: 'PATCH', params: { deckId }, body: { name: 'Meu' } }))
        .status,
    ).toBe(403);
    asUser(owner);

    expect((await call(deck.DELETE, { method: 'DELETE', params: { deckId } })).status).toBe(204);
    expect((await call(deck.GET, { params: { deckId } })).status).toBe(404);
  });

  it('informa cartas não encontradas e valida entrada', async () => {
    asUser(await createTestUser(testState.db!));
    stubExternalApis();
    const res = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'text', name: 'Teste', text: '1 Carta Fantasma\n1 Sol Ring' },
    });
    expect(res.status).toBe(201);
    expect(res.body!.notFound).toEqual(['Carta Fantasma']);

    expect(
      (
        await call(decks.POST, {
          method: 'POST',
          body: { kind: 'url', url: 'https://example.com/x' },
        })
      ).status,
    ).toBe(400);
    expect(
      (await call(decks.POST, { method: 'POST', body: { kind: 'text', name: '', text: '' } }))
        .status,
    ).toBe(400);
  });

  it('retorna 502 quando a origem externa falha', async () => {
    asUser(await createTestUser(testState.db!));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('erro', { status: 500 })),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'url', url: 'https://moxfield.com/decks/abc' },
    });
    expect(res.status).toBe(502);
    expect(res.body!.error).toMatchObject({
      code: 'upstream_error',
      details: { source: 'moxfield', status: 500, url: 'https://moxfield.com/decks/abc' },
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('importa texto sem nome usando o cabeçalho do formato Arena', async () => {
    asUser(await createTestUser(testState.db!));
    stubExternalApis();
    const res = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'text', text: 'About\nName Do Arena\n\nDeck\n1 Sol Ring' },
    });
    expect(res.status).toBe(201);
    expect(res.body!.deck.name).toBe('Do Arena');
  });

  it('edita cartas, exporta, sincroniza com a origem e sugere nomes', async () => {
    const owner = await createTestUser(testState.db!, { name: 'Editor' });
    asUser(owner);
    stubExternalApis();
    const imported = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'url', url: 'https://archidekt.com/decks/42/omnath' },
    });
    const deckId = imported.body!.deck.id as string;

    const put = (body: unknown) => call(lines.PUT, { method: 'PUT', params: { deckId }, body });
    expect(
      (await put({ name: 'Forest', board: 'mainboard', quantity: 30, proxies: 4 })).body,
    ).toMatchObject({
      found: true,
    });
    const ghost = await put({
      name: 'Carta Fantasma',
      board: 'sideboard',
      quantity: 1,
      proxies: 0,
    });
    expect(ghost.body).toMatchObject({ found: false, line: { name: 'Carta Fantasma' } });
    expect(
      (await put({ name: 'Sol Ring', board: 'mainboard', quantity: 2, proxies: 3 })).status,
    ).toBe(400);

    const plain = await exportRoute.GET(new Request('http://localhost/'), {
      params: Promise.resolve({ deckId }),
    });
    expect(plain.headers.get('content-type')).toContain('text/plain');
    expect(plain.headers.get('content-disposition')).toBeNull();
    expect(await plain.text()).toContain('30 Forest');
    const exported = await exportRoute.GET(
      new Request(`http://localhost/?format=proxies&download=1`),
      { params: Promise.resolve({ deckId }) },
    );
    expect(exported.headers.get('content-disposition')).toBe(
      'attachment; filename="omnath-ramp.txt"',
    );
    expect(await exported.text()).toBe(
      'Commander\n1 Omnath, Locus of Mana\n\nDeck\n26 Forest\n4 Forest #proxy\n1 Sol Ring\n\nSideboard\n1 Carta Fantasma\n',
    );

    // Sincroniza pela origem (Archidekt): Carta Fantasma sai; proxies de Forest ficam.
    const synced = await call(sync.POST, { method: 'POST', params: { deckId }, body: {} });
    expect(synced.body).toMatchObject({ removed: ['Carta Fantasma'], added: [], changed: [] });
    const detail = await call(deck.GET, { params: { deckId } });
    expect(
      detail.body!.deck.lines.find((l: { name: string }) => l.name === 'Forest'),
    ).toMatchObject({ quantity: 30, proxies: 4 });

    // Lista colada (ex.: Moxfield bloqueado).
    const pasted = await call(sync.POST, {
      method: 'POST',
      params: { deckId },
      body: { text: 'Commander\n1 Omnath, Locus of Mana\n\nDeck\n10 Forest' },
    });
    expect(pasted.body).toMatchObject({ removed: ['Sol Ring'], changed: ['Forest'] });

    const outsider = await createTestUser(testState.db!, { name: 'Fora' });
    asUser(outsider);
    expect(
      (await put({ name: 'Forest', board: 'mainboard', quantity: 1, proxies: 0 })).status,
    ).toBe(403);
    expect((await call(sync.POST, { method: 'POST', params: { deckId }, body: {} })).status).toBe(
      403,
    );

    asUser(owner);
    // Sem nenhuma carta proxy, a folha só de proxies fica vazia (400); a do deck todo sai.
    await put({ name: 'Forest', board: 'mainboard', quantity: 10, proxies: 0 });
    const noProxies = await call(proxiesPdf.GET, { params: { deckId } });
    expect(noProxies.status).toBe(400);
    const allCards = await proxiesPdf.GET(new Request('http://localhost/?which=all&page=letter'), {
      params: Promise.resolve({ deckId }),
    });
    expect(allCards.headers.get('content-type')).toBe('application/pdf');
    expect(allCards.headers.get('content-disposition')).toBe(
      'attachment; filename="proxies-omnath-ramp.pdf"',
    );
    const suggestions = await call(autocomplete.GET, { path: '/?q=sol' });
    expect(suggestions.body).toEqual({ names: ['Sol Ring', 'Solemn Simulacrum'] });
    expect((await call(autocomplete.GET, { path: '/?q=s' })).body).toEqual({ names: [] });
  });

  it('lista edições e troca a edição de cópias de uma carta', async () => {
    const owner = await createTestUser(testState.db!, { name: 'Edições API' });
    asUser(owner);
    stubExternalApis();
    const imported = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'text', name: 'Prints', text: '3 Sol Ring' },
    });
    const deckId = imported.body!.deck.id as string;
    const alpha = scryfall('Sol Ring', {
      id: 'sol-lea',
      set: 'lea',
      set_name: 'Limited Edition Alpha',
      collector_number: '270',
    });
    const base = vi.mocked(fetch);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith('https://api.scryfall.com/cards/search')) {
          return Response.json({ data: [alpha] });
        }
        if (url === 'https://api.scryfall.com/cards/sol-lea') return Response.json(alpha);
        if (url === 'https://api.scryfall.com/cards/nope') return new Response('', { status: 404 });
        return base(input, init);
      }),
    );

    const list = await call(prints.GET, { path: '/?name=Sol%20Ring' });
    expect(list.body).toEqual({
      prints: [
        {
          scryfallId: 'sol-lea',
          name: 'Sol Ring',
          setCode: 'lea',
          setName: 'Limited Edition Alpha',
          collectorNumber: '270',
          imageUri: null,
          priceUsd: null,
        },
      ],
    });

    const move = (body: Record<string, unknown>) =>
      call(linePrint.POST, {
        method: 'POST',
        params: { deckId },
        body: { name: 'Sol Ring', board: 'mainboard', fromScryfallId: 'sol-ring-id', ...body },
      });
    expect((await move({ toScryfallId: 'sol-lea', quantity: 1 })).status).toBe(200);
    expect((await move({ toScryfallId: 'nope', quantity: 1 })).status).toBe(404);
    expect((await move({ toScryfallId: 'sol-lea', quantity: 0 })).status).toBe(400);

    const detail = await call(deck.GET, { params: { deckId } });
    expect(
      detail.body!.deck.lines.map((l: { scryfallId: string; quantity: number }) => [
        l.scryfallId,
        l.quantity,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ['sol-ring-id', 2],
        ['sol-lea', 1],
      ]),
    );
    const text = await exportRoute.GET(new Request('http://localhost/'), {
      params: Promise.resolve({ deckId }),
    });
    expect(await text.text()).toContain('1 Sol Ring (LEA) 270');

    // Mudar a quantidade de uma edição não mexe na outra.
    await call(lines.PUT, {
      method: 'PUT',
      params: { deckId },
      body: {
        name: 'Sol Ring',
        board: 'mainboard',
        quantity: 0,
        proxies: 0,
        scryfallId: 'sol-ring-id',
      },
    });
    const after = await call(deck.GET, { params: { deckId } });
    expect(after.body!.deck.lines.map((l: { scryfallId: string }) => l.scryfallId)).toEqual([
      'sol-lea',
    ]);
  });
});
