import { describe, expect, it } from 'vitest';
import {
  collectionFacets,
  collectionTotals,
  filterCollection,
  sortCollection,
  unitPriceUsd,
  type CollectionItem,
} from './index';

const card = (over: Partial<NonNullable<CollectionItem['card']>> = {}) => ({
  colorIdentity: [] as string[],
  cmc: 0,
  typeLine: '',
  setCode: 'tst',
  setName: 'Teste',
  releasedAt: '2021-04-23',
  artist: 'Ana Ilustra',
  rarity: 'common',
  priceUsd: null,
  priceUsdFoil: null,
  ...over,
});

const items: CollectionItem[] = [
  {
    name: 'Sol Ring',
    quantity: 3,
    foil: false,
    card: card({ cmc: 1, typeLine: 'Artifact', priceUsd: '1.50', rarity: 'uncommon' }),
    decks: [{}],
    addedAt: '2026-01-01',
  },
  {
    name: 'Sol Ring',
    quantity: 1,
    foil: true,
    card: card({ cmc: 1, typeLine: 'Artifact', priceUsd: '1.50', priceUsdFoil: '4.00' }),
    decks: [{}],
    addedAt: '2026-03-01',
  },
  {
    name: 'Cultivate',
    quantity: 2,
    foil: false,
    card: card({
      colorIdentity: ['G'],
      cmc: 3,
      typeLine: 'Sorcery',
      priceUsd: '0.30',
      setCode: 'm21',
      setName: 'Core Set 2021',
      releasedAt: '2020-07-03',
      artist: 'Anthony Palumbo',
    }),
    decks: [],
  },
  {
    name: 'Atraxa, Grand Unifier',
    quantity: 1,
    foil: false,
    card: card({
      colorIdentity: ['W', 'U', 'B', 'G'],
      cmc: 7,
      typeLine: 'Legendary Creature — Phyrexian Angel',
      priceUsd: '12.00',
      rarity: 'mythic',
      releasedAt: '2023-02-03',
    }),
    decks: [],
  },
  { name: 'Carta Inventada', quantity: 1, foil: false, card: null, decks: [] },
];

const names = (list: CollectionItem[]) => list.map((i) => `${i.name}${i.foil ? '*' : ''}`);

describe('coleção: preço, filtros, ordem e totais', () => {
  it('preço foil usa o foil e cai no comum sem ele', () => {
    expect(unitPriceUsd(items[1]!)).toBe(4);
    expect(unitPriceUsd({ foil: true, card: card({ priceUsd: '2' }) })).toBe(2);
    expect(unitPriceUsd(items[4]!)).toBeNull();
  });

  it('totais: cópias, cartas diferentes, valor e cópias sem preço', () => {
    expect(collectionTotals(items)).toEqual({ copies: 8, unique: 4, valueUsd: 21.1, unpriced: 1 });
  });

  it('filtra por texto (sem acento), cores, custo, tipo, edição, ano, ilustrador, raridade, foil e deck', () => {
    expect(names(filterCollection(items, { text: 'sorcery' }))).toEqual(['Cultivate']);
    expect(names(filterCollection(items, { text: 'atráxa' }))).toEqual(['Atraxa, Grand Unifier']);
    expect(names(filterCollection(items, { colors: ['G'] }))).toEqual([
      'Cultivate',
      'Atraxa, Grand Unifier',
    ]);
    expect(names(filterCollection(items, { colors: ['G'], colorMode: 'exact' }))).toEqual([
      'Cultivate',
    ]);
    expect(names(filterCollection(items, { colors: ['C'] }))).toEqual(['Sol Ring', 'Sol Ring*']);
    expect(names(filterCollection(items, { cmcs: [7] }))).toEqual(['Atraxa, Grand Unifier']);
    expect(names(filterCollection(items, { types: ['Creature', 'Sorcery'] }))).toEqual([
      'Cultivate',
      'Atraxa, Grand Unifier',
    ]);
    expect(names(filterCollection(items, { set: 'M21' }))).toEqual(['Cultivate']);
    expect(names(filterCollection(items, { year: 2023 }))).toEqual(['Atraxa, Grand Unifier']);
    expect(names(filterCollection(items, { artist: 'palumbo' }))).toEqual(['Cultivate']);
    expect(names(filterCollection(items, { rarity: 'mythic' }))).toEqual(['Atraxa, Grand Unifier']);
    expect(names(filterCollection(items, { foil: 'foil' }))).toEqual(['Sol Ring*']);
    expect(names(filterCollection(items, { inDeck: 'yes' }))).toEqual(['Sol Ring', 'Sol Ring*']);
    expect(filterCollection(items, { inDeck: 'no' })).toHaveLength(3);
  });

  it('ordena por valor, custo, edição (mais nova primeiro) e recentes', () => {
    expect(names(sortCollection(items, 'value'))[0]).toBe('Atraxa, Grand Unifier');
    expect(names(sortCollection(items, 'cmc')).slice(0, 2)).toEqual(['Sol Ring', 'Sol Ring*']);
    expect(names(sortCollection(items, 'set'))[0]).toBe('Atraxa, Grand Unifier');
    expect(names(sortCollection(items, 'recent'))[0]).toBe('Sol Ring*');
  });

  it('opções dos filtros a partir da coleção', () => {
    const f = collectionFacets(items);
    expect(f.sets.map((s) => s.code)).toEqual(['m21', 'tst']);
    expect(f.years).toEqual([2023, 2021, 2020]);
    expect(f.artists).toEqual(['Ana Ilustra', 'Anthony Palumbo']);
  });
});
