import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const decks = await import('../decks/route');
const deck = await import('../decks/[deckId]/route');
const deckCard = await import('../decks/[deckId]/cards/[cardId]/route');

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
    const res = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'url', url: 'https://moxfield.com/decks/abc' },
    });
    expect(res.status).toBe(502);
    expect(res.body!.error.code).toBe('upstream_error');
  });
});
