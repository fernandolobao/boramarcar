import { describe, expect, it } from 'vitest';
import { boardOf, isTokenTypeLine, outsideDeck } from './types';

describe('tokens e emblemas', () => {
  it('reconhece pela linha de tipo do Scryfall', () => {
    expect(isTokenTypeLine('Token Creature — Soldier')).toBe(true);
    expect(isTokenTypeLine('Token Artifact — Treasure')).toBe(true);
    expect(isTokenTypeLine('Emblem — Liliana')).toBe(true);
    expect(isTokenTypeLine('Legendary Creature — Elemental')).toBe(false);
    expect(isTokenTypeLine('Creature — Elf Token Maker')).toBe(false);
    expect(isTokenTypeLine('')).toBe(false);
  });

  it('token em "talvez" (decks antigos) aparece em "tokens"; o resto fica onde está', () => {
    expect(boardOf('maybeboard', 'Token Creature — Soldier')).toBe('tokens');
    expect(boardOf('mainboard', 'Emblem — Liliana')).toBe('tokens');
    expect(boardOf('maybeboard', 'Instant')).toBe('maybeboard');
    expect(boardOf('mainboard', null)).toBe('mainboard');
  });

  it('"talvez" e tokens ficam fora do total, do preço, da coleção e da impressão', () => {
    expect(outsideDeck('maybeboard')).toBe(true);
    expect(outsideDeck('tokens')).toBe(true);
    expect(outsideDeck('sideboard')).toBe(false);
    expect(outsideDeck('mainboard')).toBe(false);
  });
});
