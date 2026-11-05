import { describe, expect, it } from 'vitest';
import {
  BEAST_WITHIN,
  CULTIVATE,
  FOREST,
  HARMONIZE,
  OMNATH,
  SOL_RING,
  WRATH,
  makeCard,
} from '../test/fixtures';
import {
  analyzeDeck,
  buildReplacementQuery,
  classifyCard,
  countPips,
  validateCommanderDeck,
  type AnalyzableCard,
} from './index';

const entry = (
  card: AnalyzableCard['card'],
  quantity = 1,
  board: AnalyzableCard['board'] = 'mainboard',
): AnalyzableCard => ({
  name: card?.name ?? 'Desconhecida',
  quantity,
  board,
  card,
});

describe('classifyCard', () => {
  it.each([
    [SOL_RING, ['ramp']],
    [CULTIVATE, ['ramp']],
    [HARMONIZE, ['draw']],
    [BEAST_WITHIN, ['removal']],
    [WRATH, ['wipe']],
    [FOREST, []],
    [OMNATH, []],
  ])('%s', (card, roles) => {
    expect([...classifyCard(card)]).toEqual(roles);
  });
});

describe('countPips', () => {
  it('conta símbolos coloridos, híbridos e incolor', () => {
    expect(countPips('{2}{W}{W}{U/B}{C}')).toEqual({ W: 2, U: 1, B: 1, R: 0, G: 0, C: 1 });
    expect(countPips(null)).toEqual({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });
  });
});

describe('buildReplacementQuery', () => {
  it('gera busca do Scryfall respeitando a identidade de cor', () => {
    expect(buildReplacementQuery('ramp', ['W', 'U'])).toBe('id<=wu otag:ramp f:commander cmc<=3');
    expect(buildReplacementQuery('wipe', [], 5)).toBe('id<=c otag:sweeper f:commander cmc<=5');
  });
});

describe('validateCommanderDeck', () => {
  it('aponta tamanho, ausência de comandante, singleton, identidade de cor e carta desconhecida', () => {
    const issues = validateCommanderDeck([
      entry(SOL_RING, 2),
      entry(WRATH),
      entry(null),
      entry(FOREST, 20),
    ]);
    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'deck_size', expected: 100, actual: 24 },
        { code: 'no_commander' },
        { code: 'not_singleton', name: 'Sol Ring', quantity: 2 },
        { code: 'unknown_card', name: 'Desconhecida' },
      ]),
    );
    expect(issues.some((i) => i.code === 'not_singleton' && i.name === 'Forest')).toBe(false);
  });

  it('detecta carta fora da identidade de cor do comandante', () => {
    const issues = validateCommanderDeck([entry(OMNATH, 1, 'commander'), entry(WRATH)]);
    expect(issues).toContainEqual({ code: 'color_identity', name: 'Wrath of God' });
  });

  it('permite cartas "any number"', () => {
    const rats = makeCard({
      name: 'Relentless Rats',
      oracleText: 'A deck can have any number of cards named Relentless Rats.',
      typeLine: 'Creature — Rat',
    });
    expect(validateCommanderDeck([entry(rats, 30)]).some((i) => i.code === 'not_singleton')).toBe(
      false,
    );
  });
});

describe('analyzeDeck', () => {
  const deck: AnalyzableCard[] = [
    entry(OMNATH, 1, 'commander'),
    entry(SOL_RING),
    entry(CULTIVATE),
    entry(HARMONIZE),
    entry(BEAST_WITHIN),
    {
      ...entry(
        makeCard({ name: 'Big Thing', cmc: 8, manaCost: '{6}{G}{G}', typeLine: 'Creature' }),
      ),
      isProxy: true,
    },
    entry(FOREST, 37),
    entry(makeCard({ name: 'Ideia', cmc: 1 }), 1, 'maybeboard'),
  ];
  const analysis = analyzeDeck(deck);

  it('calcula contagens, curva e cores', () => {
    expect(analysis).toMatchObject({
      totalCards: 43,
      commanders: ['Omnath, Locus of Mana'],
      colorIdentity: ['G'],
      lands: 37,
      nonLands: 6,
      proxies: 1,
      roles: { ramp: 2, draw: 1, removal: 1, wipe: 0 },
    });
    expect(analysis.manaCurve).toEqual({
      '0': 0,
      '1': 1,
      '2': 0,
      '3': 2,
      '4': 1,
      '5': 0,
      '6': 0,
      '7+': 1,
    });
    expect(analysis.averageCmc).toBeCloseTo((1 + 3 + 4 + 3 + 8) / 5);
    expect(analysis.colorPips.G).toBe(1 + 1 + 2 + 1 + 2);
  });

  it('dá nota e sugestões', () => {
    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.score).toBeLessThan(100);
    expect(analysis.scoreBreakdown.find((c) => c.key === 'lands')?.score).toBe(25);
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({
        code: 'more_role',
        role: 'ramp',
        missing: 8,
        scryfallQuery: 'id<=g otag:ramp f:commander cmc<=3',
      }),
    );
    expect(analysis.suggestions.some((s) => s.code === 'lower_curve')).toBe(true);
  });

  it('nota máxima para um deck "ideal"', () => {
    const many = (prefix: string, card: typeof SOL_RING, n: number) =>
      Array.from({ length: n }, (_, i) => entry({ ...card, name: `${prefix} ${i}`, cmc: 2 }));
    const ideal = analyzeDeck([
      entry(OMNATH, 1, 'commander'),
      entry(FOREST, 37),
      ...many('Ramp', SOL_RING, 10),
      ...many('Draw', HARMONIZE, 10),
      ...many('Removal', BEAST_WITHIN, 8),
      ...many('Wipe', WRATH, 2),
    ]);
    expect(ideal.score).toBe(100);
    expect(ideal.suggestions).toEqual([]);
  });
});
