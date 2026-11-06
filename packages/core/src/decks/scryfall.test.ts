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
    expect(headers['User-Agent']).toMatch(/BoraMarcar/);
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
});
