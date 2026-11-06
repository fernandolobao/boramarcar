import { describe, expect, it } from 'vitest';
import { expandPrintList, MM_TO_PT, printImageUrl, proxySheetLayout, toWinAnsi } from './proxies';

describe('folha de proxies', () => {
  it('3×3 por página, em tamanho real e centralizado', () => {
    const slots = proxySheetLayout(10, 'a4');
    expect(slots.map((s) => s.page)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    const first = slots[0]!;
    expect(first.width / MM_TO_PT).toBeCloseTo(63);
    expect(first.height / MM_TO_PT).toBeCloseTo(88);
    // Margens de (210 - 189) / 2 = 10,5 mm e (297 - 264) / 2 = 16,5 mm.
    expect(first.x / MM_TO_PT).toBeCloseTo(10.5);
    expect(first.y / MM_TO_PT).toBeCloseTo(297 - 16.5 - 88);
    expect(slots[1]!.x - first.x).toBeCloseTo(63 * MM_TO_PT);
    expect(first.y - slots[3]!.y).toBeCloseTo(88 * MM_TO_PT);
    expect(slots[9]).toMatchObject({ page: 1, x: first.x, y: first.y });
    // Carta: cabe também em Carta (Letter).
    const letter = proxySheetLayout(9, 'letter');
    expect(letter.at(-1)!.y).toBeGreaterThan(0);
  });

  it('lista de impressão: só proxies ou tudo, com imagem grande', () => {
    const lines = [
      {
        name: 'Forest',
        quantity: 10,
        proxies: 2,
        card: { imageUri: 'https://cards.scryfall.io/normal/front/f.jpg?1' },
      },
      { name: 'Sem Imagem', quantity: 1, proxies: 1, card: null },
      { name: 'Sol Ring', quantity: 1, proxies: 0, card: { imageUri: null } },
    ];
    expect(expandPrintList(lines)).toEqual([
      { name: 'Forest', imageUri: 'https://cards.scryfall.io/large/front/f.jpg?1' },
      { name: 'Forest', imageUri: 'https://cards.scryfall.io/large/front/f.jpg?1' },
      { name: 'Sem Imagem', imageUri: null },
    ]);
    expect(expandPrintList(lines, 'all')).toHaveLength(12);
    expect(printImageUrl('https://cards.scryfall.io/png/front/x.png?2')).toBe(
      'https://cards.scryfall.io/large/front/x.jpg?2',
    );
    expect(toWinAnsi('Lim-Dûl’s Vault 日本')).toBe('Lim-Dûl?s Vault ??');
  });
});
