import type { CardData } from '../decks/types';

let counter = 0;
export function makeCard(overrides: Partial<CardData> & { name: string }): CardData {
  counter += 1;
  return {
    scryfallId: `id-${counter}`,
    oracleId: null,
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact',
    oracleText: '',
    colors: [],
    colorIdentity: [],
    imageUri: null,
    priceUsd: null,
    ...overrides,
  };
}

export const SOL_RING = makeCard({
  name: 'Sol Ring',
  manaCost: '{1}',
  cmc: 1,
  typeLine: 'Artifact',
  oracleText: '{T}: Add {C}{C}.',
});

export const CULTIVATE = makeCard({
  name: 'Cultivate',
  manaCost: '{2}{G}',
  cmc: 3,
  typeLine: 'Sorcery',
  oracleText:
    'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',
  colorIdentity: ['G'],
});

export const HARMONIZE = makeCard({
  name: 'Harmonize',
  manaCost: '{2}{G}{G}',
  cmc: 4,
  typeLine: 'Sorcery',
  oracleText: 'Draw three cards.',
  colorIdentity: ['G'],
});

export const BEAST_WITHIN = makeCard({
  name: 'Beast Within',
  manaCost: '{2}{G}',
  cmc: 3,
  typeLine: 'Instant',
  oracleText: 'Destroy target permanent. Its controller creates a 3/3 green Beast creature token.',
  colorIdentity: ['G'],
});

export const WRATH = makeCard({
  name: 'Wrath of God',
  manaCost: '{2}{W}{W}',
  cmc: 4,
  typeLine: 'Sorcery',
  oracleText: "Destroy all creatures. They can't be regenerated.",
  colorIdentity: ['W'],
});

export const FOREST = makeCard({
  name: 'Forest',
  manaCost: '',
  cmc: 0,
  typeLine: 'Basic Land — Forest',
  oracleText: '({T}: Add {G}.)',
  colorIdentity: ['G'],
});

export const OMNATH = makeCard({
  name: 'Omnath, Locus of Mana',
  manaCost: '{2}{G}',
  cmc: 3,
  typeLine: 'Legendary Creature — Elemental',
  oracleText: "Green mana doesn't empty from your mana pool as steps and phases end.",
  colorIdentity: ['G'],
});
