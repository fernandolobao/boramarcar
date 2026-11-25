import { describe, expect, it } from 'vitest';
import { buildLibrary, drawNext, drawOpening, londonMulligan, type HandCard } from './hand';

/** Sorteio previsível (para os testes). */
const seeded = (seed = 42) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const deck = [
  { name: 'Omnath', board: 'commander' as const, quantity: 1, isLand: false, imageUri: null },
  { name: 'Forest', board: 'mainboard' as const, quantity: 36, isLand: true, imageUri: null },
  { name: 'Sol Ring', board: 'mainboard' as const, quantity: 1, isLand: false, imageUri: null },
  { name: 'Cultivate', board: 'mainboard' as const, quantity: 62, isLand: false, imageUri: null },
  { name: 'Talvez', board: 'maybeboard' as const, quantity: 3, isLand: false, imageUri: null },
  { name: 'Reserva', board: 'sideboard' as const, quantity: 15, isLand: false, imageUri: null },
];

describe('testar a mão inicial (11.3)', () => {
  it('o grimório é só o deck principal: sem comandante, reserva e "talvez"', () => {
    const library = buildLibrary(deck);
    expect(library).toHaveLength(99);
    expect(library.filter((c) => c.isLand)).toHaveLength(36);
    expect(new Set(library.map((c) => c.id)).size).toBe(99);
  });

  it('a mão inicial tem 7 cartas, tiradas do grimório embaralhado', () => {
    const { hand, library } = drawOpening(buildLibrary(deck), seeded());
    expect(hand).toHaveLength(7);
    expect(library).toHaveLength(92);
    const all = [...hand, ...library].map((c) => c.id).sort();
    expect(all).toEqual(
      buildLibrary(deck)
        .map((c) => c.id)
        .sort(),
    );
  });

  it('mulligan de Londres: compra 7 de novo e põe N cartas escolhidas no fundo', () => {
    const start = drawOpening(buildLibrary(deck), seeded(1));
    const again = drawOpening(buildLibrary(deck), seeded(2));
    const bottom = again.hand.slice(0, 2).map((c) => c.id);
    const kept = londonMulligan(again, bottom);
    expect(kept.hand).toHaveLength(5);
    expect(kept.library).toHaveLength(94);
    expect(kept.library.slice(-2).map((c) => c.id)).toEqual(bottom);
    expect(() => londonMulligan(start, ['nao-esta-na-mao'])).toThrow();
  });

  it('comprar a próxima carta tira do topo do grimório', () => {
    const state = drawOpening(buildLibrary(deck), seeded(3));
    const next = drawNext(state);
    expect(next.hand).toHaveLength(8);
    expect(next.hand.at(-1)!.id).toBe(state.library[0]!.id);
    expect(next.library).toHaveLength(91);
  });

  it('cartas iguais no grimório ficam com ids diferentes (para escolher qual vai ao fundo)', () => {
    const forests = buildLibrary(deck).filter((c: HandCard) => c.name === 'Forest');
    expect(new Set(forests.map((c) => c.id)).size).toBe(36);
  });
});
