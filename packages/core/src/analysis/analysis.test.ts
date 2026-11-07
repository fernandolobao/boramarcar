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
    expect(analysis.cardsByCurve['3'].sort()).toEqual(['Beast Within', 'Cultivate']);
    expect(analysis.cardsByCurve['7+']).toEqual(['Big Thing']);
    expect(analysis.cardsByCurve['0']).toEqual([]);
  });

  it('cada componente da nota traz a meta usada no cálculo', () => {
    expect(analysis.scoreBreakdown.map((c) => [c.key, c.max, c.target])).toEqual([
      ['lands', 25, { min: 36, max: 38 }],
      ['ramp', 20, { count: 10 }],
      ['draw', 20, { count: 10 }],
      ['removal', 15, { count: 8 }],
      ['wipe', 10, { count: 2 }],
      ['curve', 10, { ideal: 3, max: 4.5 }],
    ]);
    expect(analysis.scoreBreakdown.reduce((s, c) => s + c.max, 0)).toBe(100);
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

describe('análise por formato', () => {
  const bolt = makeCard({
    name: 'Lightning Bolt',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    colorIdentity: ['R'],
  });
  const mountain = makeCard({
    name: 'Mountain',
    typeLine: 'Basic Land — Mountain',
    colorIdentity: [],
    producedMana: ['R'],
  });

  it('Modern: 60+ cartas, até 4 cópias (contando a reserva), reserva até 15, sem nota', () => {
    const deck = [entry(bolt, 4), entry(mountain, 20), entry(bolt, 1, 'sideboard')];
    const analysis = analyzeDeck(deck, 'modern');
    expect(analysis.kind).toBe('constructed');
    expect(analysis.score).toBeNull();
    expect(analysis.validation).toEqual(
      expect.arrayContaining([
        { code: 'deck_size_min', min: 60, actual: 24 },
        { code: 'too_many_copies', name: 'Lightning Bolt', quantity: 5, max: 4 },
      ]),
    );
    expect(analysis.validation.some((i) => i.code === 'no_commander')).toBe(false);
    expect(analysis.suggestions).toEqual([{ code: 'more_lands', missing: 2 }]);
    expect(analysis.colorIdentity).toEqual(['R']);
    expect(analysis.handOdds?.library).toBe(24);
  });

  it('Draft: 40 cartas, sem limite de cópias', () => {
    const analysis = analyzeDeck([entry(bolt, 23), entry(mountain, 17)], 'draft');
    expect(analysis.validation).toEqual([]);
    expect(analysis.suggestions).toEqual([]);
  });

  it('usa as funções do Tagger quando existem e conta a cobertura', () => {
    const tagged = { ...bolt, roles: ['removal', 'wipe'] };
    const analysis = analyzeDeck([entry(tagged, 1), entry(SOL_RING, 1)]);
    expect(analysis.roles.wipe).toBe(1);
    expect(analysis.roles.removal).toBe(0);
    expect(analysis.rolesTagged).toEqual({ tagged: 1, total: 2 });
    expect(analysis.score).not.toBeNull();
  });

  it('busca de substitutos respeita o formato', () => {
    expect(buildReplacementQuery('removal', ['R'], 2, 'modern')).toBe(
      'id<=r otag:removal f:modern cmc<=2',
    );
    expect(buildReplacementQuery('tutor', ['B'], 3, null)).toBe('id<=b otag:tutor cmc<=3');
  });
});

describe('lista de banidas e restritas (Scryfall)', () => {
  const legal = (formats: Record<string, string>) =>
    Object.fromEntries(
      ['commander', 'modern', 'vintage', 'standard'].map((f) => [f, formats[f] ?? 'legal']),
    );
  const card = (name: string, legalities: Record<string, string> | null) =>
    makeCard({ name, typeLine: 'Sorcery', legalities });
  const forest = makeCard({
    name: 'Forest',
    typeLine: 'Basic Land — Forest',
    legalities: legal({ standard: 'not_legal' }),
  });

  it('aponta banidas, restritas com mais de uma cópia e cartas fora do formato', () => {
    const deck = [
      entry(card('Primeval Titan', legal({ commander: 'banned' }))),
      entry(
        card(
          'Black Lotus',
          legal({ commander: 'banned', vintage: 'restricted', modern: 'not_legal' }),
        ),
        2,
      ),
      entry(card('Sem Dados', null)),
      entry(forest, 30),
    ];
    const commander = analyzeDeck(deck, 'commander');
    expect(
      commander.validation.filter((i) => ['banned', 'restricted', 'not_legal'].includes(i.code)),
    ).toEqual([
      { code: 'banned', name: 'Primeval Titan' },
      { code: 'banned', name: 'Black Lotus' },
    ]);
    expect(commander.legalityMissing).toBe(1);
    const vintage = analyzeDeck(deck, 'vintage');
    expect(vintage.validation).toContainEqual({
      code: 'restricted',
      name: 'Black Lotus',
      quantity: 2,
    });
    const modern = analyzeDeck(deck, 'modern');
    expect(modern.validation).toContainEqual({ code: 'not_legal', name: 'Black Lotus' });
    // Básico fora do Standard não é apontado; formato sem lista (draft) não confere.
    expect(
      analyzeDeck(deck, 'standard').validation.some(
        (i) => i.code === 'not_legal' && i.name === 'Forest',
      ),
    ).toBe(false);
    expect(analyzeDeck(deck, 'draft').validation.some((i) => i.code === 'banned')).toBe(false);
  });
});
