import { describe, expect, it, vi } from 'vitest';
import { attachCardData, fetchScryfallCollection, mapScryfallCard } from './scryfall';

const scryCard = (name: string, extra: Record<string, unknown> = {}) => ({
  id: `${name}-id`,
  name,
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  ...extra,
});

describe('mapScryfallCard', () => {
  it('usa a face da frente em cartas dupla face', () => {
    const card = mapScryfallCard({
      id: 'x',
      name: 'Front // Back',
      cmc: 2,
      type_line: '',
      color_identity: ['U'],
      card_faces: [
        {
          mana_cost: '{1}{U}',
          type_line: 'Creature — Human',
          oracle_text: 'Draw a card.',
          image_uris: { normal: 'img' },
        },
        { oracle_text: 'Back text' },
      ],
    });
    expect(card).toMatchObject({
      manaCost: '{1}{U}',
      typeLine: 'Creature — Human',
      oracleText: 'Draw a card.\n//\nBack text',
      imageUri: 'img',
      colorIdentity: ['U'],
    });
  });
});

describe('fetchScryfallCollection', () => {
  it('divide em lotes de 75, deduplica e coleta não encontradas', async () => {
    const entries = Array.from({ length: 80 }, (_, i) => ({ name: `Card ${i}` }));
    entries.push({ name: 'card 0' }); // duplicada (case-insensitive)
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { identifiers: { name: string }[] };
      return new Response(
        JSON.stringify({
          data: body.identifiers.slice(1).map((i) => scryCard(i.name)),
          not_found: [body.identifiers[0]],
        }),
      );
    });
    const result = await fetchScryfallCollection(entries, { fetch: fetchFn, delayMs: 0 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.cards).toHaveLength(78);
    expect(result.notFound).toEqual(['Card 0', 'Card 75']);
    const headers = fetchFn.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/ArcanaKin/);
  });

  it('propaga erro HTTP', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(
      fetchScryfallCollection([{ name: 'x' }], { fetch: fetchFn }),
    ).rejects.toMatchObject({
      code: 'upstream_error',
    });
  });
});

describe('attachCardData', () => {
  it('associa por id, nome e face da frente', () => {
    const cards = [
      mapScryfallCard(scryCard('Sol Ring')),
      mapScryfallCard(scryCard('Delver of Secrets // Insectile Aberration')),
    ];
    const result = attachCardData(
      [
        { name: 'Qualquer', scryfallId: 'Sol Ring-id' },
        { name: 'delver of secrets' },
        { name: 'Inexistente' },
      ],
      cards,
    );
    expect(result.map((r) => r.card?.name ?? null)).toEqual([
      'Sol Ring',
      'Delver of Secrets // Insectile Aberration',
      null,
    ]);
  });
});

describe('fetchScryfallAutocomplete', () => {
  it('consulta o autocomplete e ignora buscas curtas', async () => {
    const { fetchScryfallAutocomplete } = await import('./scryfall');
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({ object: 'catalog', data: ['Sol Ring', 'Solemn Simulacrum'] }),
    );
    expect(await fetchScryfallAutocomplete('sol r', { fetch: fetchMock })).toEqual([
      'Sol Ring',
      'Solemn Simulacrum',
    ]);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.scryfall.com/cards/autocomplete?q=sol%20r',
    );
    expect(await fetchScryfallAutocomplete(' s ', { fetch: fetchMock })).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(
      fetchScryfallAutocomplete('sol', { fetch: async () => new Response('x', { status: 503 }) }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });

  it('busca cartas e trata "sem resultados"', async () => {
    const { fetchScryfallSearch } = await import('./scryfall');
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({
        data: [scryCard('Arcane Signet', { produced_mana: ['C'], game_changer: false })],
      }),
    );
    const found = await fetchScryfallSearch('otag:ramp id<=g', { fetch: fetchMock });
    expect(found.map((c) => [c.name, c.producedMana])).toEqual([['Arcane Signet', ['C']]]);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.scryfall.com/cards/search?q=otag%3Aramp%20id%3C%3Dg&order=edhrec&unique=cards',
    );
    expect(
      await fetchScryfallSearch('x', { fetch: async () => new Response('{}', { status: 404 }) }),
    ).toEqual([]);
  });

  it('busca por edição + número e, se não existir, pelo nome', async () => {
    const bodies: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { identifiers: Record<string, string>[] };
      bodies.push(body.identifiers);
      if (bodies.length === 1) {
        return Response.json({
          data: [
            scryCard('Sol Ring', {
              id: 'cmm-sol',
              set: 'cmm',
              set_name: 'Commander Masters',
              collector_number: '400',
            }),
          ],
          not_found: [{ set: 'xyz', collector_number: '1' }],
        });
      }
      return Response.json({ data: [scryCard('Arcane Signet', { id: 'signet' })], not_found: [] });
    });
    const result = await fetchScryfallCollection(
      [
        { name: 'Sol Ring', setCode: 'CMM', collectorNumber: '400' },
        { name: 'Arcane Signet', setCode: 'xyz', collectorNumber: '1' },
      ],
      { fetch: fetchMock, delayMs: 0 },
    );
    expect(bodies).toEqual([
      [
        { set: 'cmm', collector_number: '400' },
        { set: 'xyz', collector_number: '1' },
      ],
      [{ name: 'Arcane Signet' }],
    ]);
    expect(result.notFound).toEqual([]);
    expect(result.cards[0]).toMatchObject({
      setCode: 'cmm',
      setName: 'Commander Masters',
      collectorNumber: '400',
    });
    const linked = attachCardData(
      [{ name: 'Sol Ring', setCode: 'cmm', collectorNumber: '400' }, { name: 'Sol Ring' }],
      [mapScryfallCard(scryCard('Sol Ring', { id: 'other' })), ...result.cards],
    );
    expect(linked.map((l) => l.card?.scryfallId)).toEqual(['cmm-sol', 'cmm-sol']);
  });

  it('lista as impressões de uma carta', async () => {
    const { fetchScryfallPrints } = await import('./scryfall');
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({
        data: [
          scryCard('Sol Ring', {
            id: 'a',
            set: 'cmm',
            set_name: 'Commander Masters',
            collector_number: '400',
            prices: { usd: '1.50' },
          }),
        ],
      }),
    );
    expect(await fetchScryfallPrints('Sol Ring', { fetch: fetchMock })).toEqual([
      {
        scryfallId: 'a',
        name: 'Sol Ring',
        setCode: 'cmm',
        setName: 'Commander Masters',
        collectorNumber: '400',
        imageUri: null,
        priceUsd: '1.50',
      },
    ]);
    expect(decodeURIComponent(fetchMock.mock.calls[0]![0])).toContain(
      '!"Sol Ring" game:paper&unique=prints',
    );
  });

  it('segue as próximas páginas das impressões (terrenos básicos têm mais de mil)', async () => {
    const { fetchScryfallPrints, MAX_PRINT_PAGES } = await import('./scryfall');
    let calls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      calls++;
      const page = Number(new URL(url).searchParams.get('page') ?? '1');
      return Response.json({
        data: [
          scryCard('Island', {
            id: `i${page}`,
            set: page === 3 ? 'pca' : 'x',
            collector_number: '137',
          }),
        ],
        has_more: page < 3,
        next_page: `https://api.scryfall.com/cards/search?q=x&page=${page + 1}`,
      });
    });
    const prints = await fetchScryfallPrints('Island', {
      fetch: fetchMock as unknown as typeof fetch,
      delayMs: 0,
    });
    expect(prints.map((p) => p.scryfallId)).toEqual(['i1', 'i2', 'i3']);
    expect(prints[2]).toMatchObject({ setCode: 'pca', collectorNumber: '137' });
    expect(calls).toBe(3);

    // Limite de páginas, e erro numa página do meio devolve o que já veio.
    const endless = vi.fn(async () =>
      Response.json({ data: [scryCard('Island')], has_more: true, next_page: 'https://x/next' }),
    );
    await fetchScryfallPrints('Island', { fetch: endless as unknown as typeof fetch, delayMs: 0 });
    expect(endless).toHaveBeenCalledTimes(MAX_PRINT_PAGES);
    let n = 0;
    const flaky = vi.fn(async () =>
      n++ === 0
        ? Response.json({ data: [scryCard('Island')], has_more: true, next_page: 'https://x/2' })
        : new Response('', { status: 500 }),
    );
    expect(
      await fetchScryfallPrints('Island', { fetch: flaky as unknown as typeof fetch, delayMs: 0 }),
    ).toHaveLength(1);
  });

  it('guarda o verso de cartas de duas faces (e não de cartas divididas)', () => {
    const dfc = mapScryfallCard(
      scryCard('Delver of Secrets // Insectile Aberration', {
        card_faces: [
          { name: 'Delver of Secrets', image_uris: { normal: 'https://x/front.jpg' } },
          { name: 'Insectile Aberration', image_uris: { normal: 'https://x/back.jpg' } },
        ],
      }),
    );
    expect(dfc).toMatchObject({
      imageUri: 'https://x/front.jpg',
      backImageUri: 'https://x/back.jpg',
      backName: 'Insectile Aberration',
    });
    const split = mapScryfallCard(
      scryCard('Fire // Ice', {
        image_uris: { normal: 'https://x/split.jpg' },
        card_faces: [{ name: 'Fire' }, { name: 'Ice' }],
      }),
    );
    expect(split).toMatchObject({ imageUri: 'https://x/split.jpg', backImageUri: null });
  });
});
