import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import {
  comparableCards,
  compareWithDecks,
  edhrecCommanderUrl,
  leastPopularCards,
  type ComparableDeck,
} from './index';

const roles = {
  ramp: 0,
  draw: 0,
  removal: 0,
  wipe: 0,
  tutor: 0,
  protection: 0,
  recursion: 0,
  counterspell: 0,
};
const deck = (
  score: number | null,
  lands: number,
  ramp: number,
  cards: string[],
): ComparableDeck => ({
  analysis: { score, lands, averageCmc: 3, roles: { ...roles, ramp } },
  cards,
});

describe('comparação com decks do mesmo comandante', () => {
  it('URL do EDHREC (com acentos, apóstrofos e parceiros)', () => {
    expect(edhrecCommanderUrl(["Atraxa, Praetors' Voice"])).toBe(
      'https://edhrec.com/commanders/atraxa-praetors-voice',
    );
    expect(edhrecCommanderUrl(['Tymna the Weaver', 'Thrasios, Triton Hero'])).toBe(
      'https://edhrec.com/commanders/thrasios-triton-hero-tymna-the-weaver',
    );
    expect(edhrecCommanderUrl(['Lim-Dûl the Necromancer'])).toBe(
      'https://edhrec.com/commanders/lim-dul-the-necromancer',
    );
    expect(edhrecCommanderUrl([])).toBeNull();
  });

  it('médias, cartas comuns que faltam e escolhas próprias', () => {
    const result = compareWithDecks(deck(60, 36, 8, ['Sol Ring', 'Minha Carta']), [
      deck(70, 37, 10, ['Sol Ring', 'Arcane Signet', 'Cultivate']),
      deck(80, 38, 12, ['sol ring', 'Arcane Signet']),
      deck(null, 35, 9, ['Arcane Signet', 'Rara']),
    ]);
    expect(result.decks).toBe(3);
    expect(result.metrics.find((m) => m.key === 'score')).toEqual({
      key: 'score',
      value: 60,
      average: 75,
    });
    expect(result.metrics.find((m) => m.key === 'ramp')).toEqual({
      key: 'ramp',
      value: 8,
      average: 10.3,
    });
    expect(result.commonMissing).toEqual([{ name: 'Arcane Signet', share: 1 }]);
    expect(result.unique).toEqual(['Minha Carta']);
    expect(compareWithDecks(deck(1, 1, 1, ['A']), [])).toMatchObject({
      decks: 0,
      commonMissing: [],
      unique: [],
    });
  });

  it('cartas comparáveis e menos populares', () => {
    const forest = makeCard({ name: 'Forest', typeLine: 'Basic Land — Forest' });
    const temple = makeCard({ name: 'Temple', typeLine: 'Land' });
    const sol = makeCard({ name: 'Sol Ring', edhrecRank: 1 });
    const odd = makeCard({ name: 'Rara', edhrecRank: 20000 });
    const entries = [
      { name: 'Forest', quantity: 30, board: 'mainboard' as const, card: forest },
      { name: 'Temple', quantity: 1, board: 'mainboard' as const, card: temple },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' as const, card: sol },
      { name: 'Rara', quantity: 1, board: 'mainboard' as const, card: odd },
      { name: 'Cmd', quantity: 1, board: 'commander' as const, card: sol },
    ];
    expect(comparableCards(entries)).toEqual(['Temple', 'Sol Ring', 'Rara']);
    expect(leastPopularCards(entries)).toEqual([
      { name: 'Rara', rank: 20000 },
      { name: 'Sol Ring', rank: 1 },
    ]);
  });
});
