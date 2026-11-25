import { describe, expect, it } from 'vitest';
import { manaSymbolUrl, splitManaText } from './index';

describe('símbolos de mana no texto da carta (app)', () => {
  it('separa o texto dos símbolos', () => {
    expect(splitManaText('{W}{U}{B}{R}{G}: Creatures you control gain menace.')).toEqual([
      { symbol: 'W' },
      { symbol: 'U' },
      { symbol: 'B' },
      { symbol: 'R' },
      { symbol: 'G' },
      { text: ': Creatures you control gain menace.' },
    ]);
    expect(splitManaText('{T}, Sacrifice: add {C}.')).toEqual([
      { symbol: 'T' },
      { text: ', Sacrifice: add ' },
      { symbol: 'C' },
      { text: '.' },
    ]);
    expect(splitManaText('Sem símbolos')).toEqual([{ text: 'Sem símbolos' }]);
    expect(splitManaText('')).toEqual([]);
  });

  it('endereço do símbolo oficial (SVG do Scryfall), inclusive híbrido e phyrexiano', () => {
    expect(manaSymbolUrl('W')).toBe('https://svgs.scryfall.io/card-symbols/W.svg');
    expect(manaSymbolUrl('2')).toBe('https://svgs.scryfall.io/card-symbols/2.svg');
    expect(manaSymbolUrl('w/u')).toBe('https://svgs.scryfall.io/card-symbols/WU.svg');
    expect(manaSymbolUrl('G/P')).toBe('https://svgs.scryfall.io/card-symbols/GP.svg');
    expect(manaSymbolUrl('T')).toBe('https://svgs.scryfall.io/card-symbols/T.svg');
    // Fora do padrão (texto qualquer entre chaves): sem imagem, o app mostra o texto.
    expect(manaSymbolUrl('../x')).toBeNull();
  });
});
