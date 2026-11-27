import { describe, expect, it } from 'vitest';
import {
  achievementSchema,
  deckDetailSchema,
  groupStatsSchema,
  playerProfileSchema,
} from './schemas';

const analysis = {
  totalCards: 100,
  commanders: ['Omnath, Locus of Mana'],
  colorIdentity: ['G'],
  lands: 37,
  averageCmc: 3.1,
  manaCurve: { '2': 10 },
  roles: { ramp: 9 },
  proxies: 0,
  gameChangers: [],
  score: 80,
  validation: [],
};
const deck = (extra: Record<string, unknown>) => ({
  id: 'd1',
  name: 'Omnath',
  format: 'commander',
  visibility: 'group',
  ownerName: 'Ana',
  isOwner: true,
  lines: [],
  bracket: null,
  analysis: { ...analysis, ...extra },
});

describe('esquemas do app', () => {
  it('deck: base de mana e mão inicial chegam ao app; dado estranho só tira a seção', () => {
    const ok = deckDetailSchema.parse(
      deck({
        manaBase: [
          {
            color: 'G',
            pips: 30,
            share: 1,
            landSources: 30,
            otherSources: 9,
            recommended: 25,
            status: 'ok',
          },
        ],
        handOdds: {
          library: 99,
          lands: 37,
          distribution: [],
          keepable: 0.78,
          expectedLands: 2.6,
          landDrops: [{ turn: 2, onPlay: 0.9, onDraw: 0.93 }],
          rampByTurn: [],
        },
      }),
    );
    expect(ok.analysis.manaBase?.[0]?.landSources).toBe(30);
    expect(ok.analysis.handOdds?.keepable).toBe(0.78);
    // Servidor antigo (sem os campos) ou dado quebrado: o deck abre do mesmo jeito.
    expect(deckDetailSchema.parse(deck({})).analysis.manaBase).toBeUndefined();
    const broken = deckDetailSchema.parse(deck({ manaBase: 'x', handOdds: { keepable: 'y' } }));
    expect(broken.analysis.manaBase).toBeUndefined();
    expect(broken.analysis.handOdds).toBeUndefined();
  });

  it('as conquistas da trilha intermediária são conhecidas pelo app', () => {
    for (const id of ['learn_intermediate', 'learn_challenges_intermediate', 'learn_master']) {
      expect(
        achievementSchema.safeParse({
          id,
          unlocked: false,
          unlockedAt: null,
          progress: 0,
          target: 6,
        }).success,
      ).toBe(true);
    }
    expect(playerProfileSchema).toBeDefined();
  });

  it('estatísticas: decks e quem começa chegam ao app; servidor antigo não derruba', () => {
    const base = { totalGames: 3, players: [], commanders: [], activity: [] };
    const full = groupStatsSchema.parse({
      ...base,
      firstPlayerWinRate: 0.5,
      firstPlayerSample: 2,
      decks: [
        {
          deckId: 'd1',
          name: 'Omnath',
          userId: 'u1',
          ownerName: 'Ana',
          games: 2,
          wins: 1,
          winRate: 0.5,
        },
      ],
    });
    expect(full.decks?.[0]?.ownerName).toBe('Ana');
    expect(full.firstPlayerSample).toBe(2);
    const old = groupStatsSchema.parse(base);
    expect(old.decks).toBeUndefined();
    expect(groupStatsSchema.parse({ ...base, decks: 'x' }).decks).toBeUndefined();
  });
});
