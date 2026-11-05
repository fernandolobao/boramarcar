import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../errors';
import { fetchArchidektDeck, mapArchidektDeck } from './importers/archidekt';
import { fetchMoxfieldDeck, mapMoxfieldDeck } from './importers/moxfield';
import { parseDeckUrl } from './importers/url';
import { resolveDeckImport } from './import';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const archidektPayload = {
  id: 123,
  name: 'Omnath Ramp',
  categories: [
    { name: 'Commander', includedInDeck: true, isPremier: true },
    { name: 'Ramp', includedInDeck: true },
    { name: 'Maybeboard', includedInDeck: false },
    { name: 'Ideias', includedInDeck: false },
  ],
  cards: [
    {
      quantity: 1,
      categories: ['Commander'],
      card: { uid: 'omnath-id', oracleCard: { name: 'Omnath, Locus of Mana' } },
    },
    {
      quantity: 1,
      categories: ['Ramp'],
      modifier: 'Foil',
      card: {
        uid: 'sol-id',
        collectorNumber: '1',
        edition: { editioncode: 'cmm' },
        oracleCard: { name: 'Sol Ring' },
      },
    },
    { quantity: 1, categories: ['Ideias'], card: { oracleCard: { name: 'Harmonize' } } },
    { quantity: 30, categories: null, card: { oracleCard: { name: 'Forest' } } },
  ],
};

const moxfieldPayload = {
  publicId: 'abc-123',
  name: 'Omnath Mox',
  boards: {
    commanders: {
      cards: {
        x: { quantity: 1, card: { name: 'Omnath, Locus of Mana', scryfall_id: 'omnath-id' } },
      },
    },
    mainboard: {
      cards: {
        a: { quantity: 1, finish: 'foil', card: { name: 'Sol Ring', set: 'cmm', cn: '1' } },
        b: { quantity: 30, card: { name: 'Forest' } },
      },
    },
    sideboard: { cards: {} },
    maybeboard: { cards: { c: { quantity: 1, card: { name: 'Harmonize' } } } },
  },
};

describe('parseDeckUrl', () => {
  it.each([
    ['https://archidekt.com/decks/123/omnath', { source: 'archidekt', id: '123' }],
    ['https://www.archidekt.com/decks/456', { source: 'archidekt', id: '456' }],
    ['https://moxfield.com/decks/abc-123_X', { source: 'moxfield', id: 'abc-123_X' }],
  ])('reconhece %s', (url, expected) => {
    expect(parseDeckUrl(url)).toMatchObject(expected);
  });

  it.each(['não é url', 'https://scryfall.com/card/x', 'https://archidekt.com/search'])(
    'retorna null para %s',
    (url) => expect(parseDeckUrl(url)).toBeNull(),
  );
});

describe('Archidekt', () => {
  it('mapeia comandante, mainboard, maybeboard e foil', () => {
    const deck = mapArchidektDeck(archidektPayload);
    expect(deck).toMatchObject({ name: 'Omnath Ramp', source: 'archidekt', sourceId: '123' });
    expect(deck.entries).toEqual([
      { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander', scryfallId: 'omnath-id' },
      {
        name: 'Sol Ring',
        quantity: 1,
        board: 'mainboard',
        scryfallId: 'sol-id',
        setCode: 'cmm',
        collectorNumber: '1',
        isFoil: true,
      },
      { name: 'Harmonize', quantity: 1, board: 'maybeboard' },
      { name: 'Forest', quantity: 30, board: 'mainboard' },
    ]);
  });

  it('falha com payload inesperado', () => {
    expect(() => mapArchidektDeck({ foo: 1 })).toThrow(DomainError);
  });

  it('busca na API e trata 404', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(archidektPayload))
      .mockResolvedValueOnce(json({}, 404));
    await expect(fetchArchidektDeck('123', fetchFn)).resolves.toMatchObject({
      name: 'Omnath Ramp',
    });
    expect(fetchFn).toHaveBeenCalledWith('https://archidekt.com/api/decks/123/', expect.anything());
    await expect(fetchArchidektDeck('999', fetchFn)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('Moxfield', () => {
  it('mapeia boards', () => {
    const deck = mapMoxfieldDeck(moxfieldPayload);
    expect(deck.sourceUrl).toBe('https://moxfield.com/decks/abc-123');
    expect(deck.entries.map((e) => [e.name, e.board, e.quantity])).toEqual([
      ['Omnath, Locus of Mana', 'commander', 1],
      ['Sol Ring', 'mainboard', 1],
      ['Forest', 'mainboard', 30],
      ['Harmonize', 'maybeboard', 1],
    ]);
    expect(deck.entries[1]?.isFoil).toBe(true);
  });

  it('erro amigável quando a API bloqueia', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({}, 403));
    await expect(fetchMoxfieldDeck('abc', fetchFn)).rejects.toMatchObject({
      code: 'upstream_error',
    });
  });
});

describe('resolveDeckImport', () => {
  it('importa texto', async () => {
    const deck = await resolveDeckImport(
      { kind: 'text', name: 'Meu deck', text: '1 Sol Ring' },
      { fetch: vi.fn() },
    );
    expect(deck).toMatchObject({
      name: 'Meu deck',
      source: 'text',
      entries: [{ name: 'Sol Ring' }],
    });
  });

  it('rejeita texto vazio e URL desconhecida', async () => {
    await expect(
      resolveDeckImport({ kind: 'text', name: 'x', text: 'nada' }, { fetch: vi.fn() }),
    ).rejects.toThrow(DomainError);
    await expect(
      resolveDeckImport({ kind: 'url', url: 'https://example.com' }, { fetch: vi.fn() }),
    ).rejects.toThrow(DomainError);
  });

  it('importa por URL e permite renomear', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(moxfieldPayload));
    const deck = await resolveDeckImport(
      { kind: 'url', url: 'https://moxfield.com/decks/abc-123', name: 'Renomeado' },
      { fetch: fetchFn },
    );
    expect(deck.name).toBe('Renomeado');
  });
});
