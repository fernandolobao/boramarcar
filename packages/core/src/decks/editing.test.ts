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
