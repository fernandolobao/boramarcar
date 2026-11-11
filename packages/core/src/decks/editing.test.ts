import { describe, expect, it } from 'vitest';
import {
  exportDeckText,
  mergeDeckLines,
  parseDeckText,
  planDeckSync,
  splitLine,
  validateLine,
} from '.';

const row = (id: string, name: string, quantity: number, isProxy = false, board = 'mainboard') => ({
  id,
  name,
  quantity,
  isProxy,
  board: board as 'mainboard',
  card: null,
});

describe('linhas do deck', () => {
  it('junta cópias reais e proxy da mesma carta', () => {
    expect(
      mergeDeckLines([
        row('a', 'Forest', 7),
        row('b', 'forest', 3, true),
        row('c', 'Sol Ring', 1, true),
        row('d', 'Forest', 1, false, 'sideboard'),
      ]),
    ).toEqual([
      expect.objectContaining({ name: 'Forest', quantity: 10, proxies: 3, ids: ['a', 'b'] }),
      expect.objectContaining({ name: 'Sol Ring', quantity: 1, proxies: 1 }),
      expect.objectContaining({ name: 'Forest', board: 'sideboard', quantity: 1, proxies: 0 }),
    ]);
  });

  it('valida e separa quantidade e proxies', () => {
    expect(splitLine(10, 3)).toEqual([
      { quantity: 7, isProxy: false },
      { quantity: 3, isProxy: true },
    ]);
    expect(splitLine(2, 2)).toEqual([{ quantity: 2, isProxy: true }]);
    expect(splitLine(0, 0)).toEqual([]);
    expect(() => validateLine(1, 2)).toThrow(/Proxies/);
    expect(() => validateLine(-1, 0)).toThrow(/Quantidade/);
    expect(() => validateLine(1.5, 0)).toThrow(/Quantidade/);
  });
});

describe('exportar', () => {
  const lines = [
    { name: 'Omnath, Locus of Mana', board: 'commander' as const, quantity: 1, proxies: 0 },
    { name: 'Sol Ring', board: 'mainboard' as const, quantity: 1, proxies: 1 },
    { name: 'Forest', board: 'mainboard' as const, quantity: 10, proxies: 3 },
    { name: 'Lightning Bolt', board: 'maybeboard' as const, quantity: 1, proxies: 0 },
  ];

  it('texto simples com seções', () => {
    expect(exportDeckText(lines)).toBe(
      'Commander\n1 Omnath, Locus of Mana\n\nDeck\n10 Forest\n1 Sol Ring\n\nMaybeboard\n1 Lightning Bolt\n',
    );
  });

  it('com proxies marcados, reimportável sem perder nada', () => {
    const text = exportDeckText(lines, 'proxies');
    expect(text).toContain('7 Forest\n3 Forest #proxy\n1 Sol Ring #proxy');
    const parsed = parseDeckText(text);
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Forest', quantity: 7, board: 'mainboard' }),
        expect.objectContaining({ name: 'Forest', quantity: 3, isProxy: true }),
        expect.objectContaining({ name: 'Omnath, Locus of Mana', board: 'commander' }),
        expect.objectContaining({ name: 'Lightning Bolt', board: 'maybeboard' }),
      ]),
    );
  });
});

describe('sincronizar com a origem', () => {
  it('mantém proxies (limitados à nova quantidade) e informa o que mudou', () => {
    const current = [
      { name: 'Forest', board: 'mainboard' as const, quantity: 10, proxies: 3 },
      { name: 'Sol Ring', board: 'mainboard' as const, quantity: 1, proxies: 1 },
      { name: 'Cultivate', board: 'mainboard' as const, quantity: 1, proxies: 0 },
      { name: 'Mana Crypt', board: 'mainboard' as const, quantity: 1, proxies: 1 },
    ];
    const result = planDeckSync(current, [
      { name: 'Forest', quantity: 2, board: 'mainboard' },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
      { name: 'Mana Crypt', quantity: 1, board: 'sideboard' },
      { name: 'Arcane Signet', quantity: 1, board: 'mainboard' },
    ]);
    expect(result.rows.map((r) => [r.name, r.board, r.quantity, r.isProxy])).toEqual([
      ['Forest', 'mainboard', 2, true],
      ['Sol Ring', 'mainboard', 1, true],
      ['Mana Crypt', 'sideboard', 1, true],
      ['Arcane Signet', 'mainboard', 1, false],
    ]);
    expect(result.added).toEqual(['Mana Crypt', 'Arcane Signet']);
    expect(result.changed).toEqual(['Forest']);
    expect(result.removed).toEqual(['Cultivate', 'Mana Crypt']);
  });
});

describe('edições (impressões) diferentes da mesma carta', () => {
  const row = (id: string, scryfallId: string | null, quantity: number, isProxy = false) => ({
    id,
    name: 'Sol Ring',
    board: 'mainboard' as const,
    quantity,
    isProxy,
    scryfallId,
    card: null,
  });

  it('mantém uma linha por edição, cada uma com seus proxies', () => {
    const lines = mergeDeckLines([
      row('1', 'cmm', 1),
      row('2', 'cmm', 1, true),
      row('3', 'lea', 1),
    ]);
    expect(lines.map((l) => [l.scryfallId, l.quantity, l.proxies])).toEqual([
      ['cmm', 2, 1],
      ['lea', 1, 0],
    ]);
    expect(lines[0]!.key).not.toBe(lines[1]!.key);
  });

  it('exporta com a edição e o número de coleção', () => {
    expect(
      exportDeckText(
        [
          {
            name: 'Sol Ring',
            board: 'mainboard',
            quantity: 2,
            proxies: 1,
            setCode: 'cmm',
            collectorNumber: '400',
          },
          {
            name: 'Sol Ring',
            board: 'mainboard',
            quantity: 1,
            proxies: 0,
            setCode: 'lea',
            collectorNumber: '270',
          },
          { name: 'Forest', board: 'mainboard', quantity: 3, proxies: 0 },
        ],
        'proxies',
      ),
    ).toBe(
      'Deck\n3 Forest\n1 Sol Ring (CMM) 400\n1 Sol Ring (CMM) 400 #proxy\n1 Sol Ring (LEA) 270\n',
    );
  });

  it('sincroniza por edição e mantém proxies da carta', () => {
    const plan = planDeckSync(
      [{ name: 'Sol Ring', board: 'mainboard', quantity: 2, proxies: 1, scryfallId: 'cmm' }],
      [
        { name: 'Sol Ring', board: 'mainboard', quantity: 1, scryfallId: 'cmm' },
        { name: 'Sol Ring', board: 'mainboard', quantity: 1, scryfallId: 'lea' },
      ],
    );
    expect(plan.rows.map((r) => [r.entry.scryfallId, r.quantity, r.isProxy])).toEqual([
      ['cmm', 1, true],
      ['lea', 1, false],
    ]);
    expect(plan.added).toEqual(['Sol Ring']);
    expect(plan.changed).toEqual(['Sol Ring']);
  });
});

describe('foil', () => {
  it('a linha é foil quando todas as cópias são foil, e a exportação marca *F*', () => {
    const lines = mergeDeckLines([
      {
        id: '1',
        name: 'Sol Ring',
        board: 'mainboard',
        quantity: 1,
        isProxy: false,
        isFoil: true,
        card: null,
      },
      {
        id: '2',
        name: 'Sol Ring',
        board: 'mainboard',
        quantity: 1,
        isProxy: true,
        isFoil: true,
        card: null,
      },
      {
        id: '3',
        name: 'Forest',
        board: 'mainboard',
        quantity: 9,
        isProxy: false,
        isFoil: true,
        card: null,
      },
      { id: '4', name: 'Forest', board: 'mainboard', quantity: 1, isProxy: true, card: null },
    ]);
    expect(lines.find((l) => l.name === 'Sol Ring')).toMatchObject({ quantity: 2, foil: true });
    expect(lines.find((l) => l.name === 'Forest')).toMatchObject({ quantity: 10, foil: false });
    expect(
      exportDeckText([
        {
          name: 'Sol Ring',
          board: 'mainboard',
          quantity: 1,
          proxies: 0,
          foil: true,
          setCode: 'cmm',
          collectorNumber: '400',
        },
      ]),
    ).toBe('Deck\n1 Sol Ring (CMM) 400 *F*\n');
  });
});
