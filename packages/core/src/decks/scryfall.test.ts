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
