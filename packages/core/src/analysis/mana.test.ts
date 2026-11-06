import { describe, expect, it } from 'vitest';
import { estimateBracket } from './brackets';
import { atLeast, hypergeometric, manaBase, openingHandOdds } from './mana';

describe('hipergeométrica', () => {
  it('bate com valores conhecidos', () => {
    // 99 cartas, 37 terrenos, mão de 7: P(3 terrenos) ≈ 29,1%
    expect(hypergeometric(99, 37, 7, 3)).toBeCloseTo(0.291, 3);
    const total = Array.from({ length: 8 }, (_, k) => hypergeometric(99, 37, 7, k)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBeCloseTo(1, 10);
    expect(atLeast(60, 24, 7, 0)).toBeCloseTo(1, 10);
    expect(atLeast(60, 0, 7, 1)).toBe(0);
  });

  it('mão inicial e jogadas de terreno', () => {
    const odds = openingHandOdds({ library: 99, lands: 37, ramp: 10 });
    expect(odds.expectedLands).toBeCloseTo(2.62, 2);
    expect(odds.keepable).toBeGreaterThan(0.7);
    expect(odds.keepable).toBeLessThan(0.85);
    const t3 = odds.landDrops.find((d) => d.turn === 3)!;
    expect(t3.onDraw).toBeGreaterThan(t3.onPlay);
    expect(odds.rampByTurn[1]!.onDraw).toBeGreaterThan(odds.rampByTurn[0]!.onDraw);
  });
});

describe('base de mana', () => {
  it('compara fontes por cor com a recomendação proporcional', () => {
    const rows = manaBase({
      deckSize: 100,
      pips: { W: 30, U: 10, B: 0, R: 0, G: 0, C: 2 },
      cards: [
        { quantity: 20, isLand: true, producedMana: ['W'] },
        { quantity: 8, isLand: true, producedMana: ['U'] },
        { quantity: 8, isLand: true, producedMana: ['W', 'U'] },
        { quantity: 1, isLand: false, producedMana: ['C'] },
        { quantity: 1, isLand: false, producedMana: ['U'] },
      ],
    });
    expect(rows).toEqual([
      {
        color: 'W',
        pips: 30,
        share: 0.75,
        landSources: 28,
        otherSources: 0,
        recommended: 27,
        status: 'ok',
      },
      {
        color: 'U',
        pips: 10,
        share: 0.25,
        landSources: 16,
        otherSources: 1,
        recommended: 10,
        status: 'ok',
      },
    ]);
    const short = manaBase({
      deckSize: 60,
      pips: { R: 5, G: 5 },
      cards: [{ quantity: 24, isLand: true, producedMana: ['R'] }],
    });
    expect(short.find((r) => r.color === 'G')).toMatchObject({
      landSources: 0,
      recommended: 12,
      status: 'low',
    });
  });
});

describe('estimativa de bracket', () => {
  const none = { gameChangers: [], massLandDenial: [], extraTurns: [], combos: [] };
  it('sem sinais: até o bracket 2', () => {
    expect(estimateBracket(none)).toEqual({ minimum: 2, reasons: [{ code: 'clean' }] });
  });
  it('Game Changers: 1–3 → 3; 4+ → 4', () => {
    expect(estimateBracket({ ...none, gameChangers: ['Rhystic Study'] }).minimum).toBe(3);
    expect(estimateBracket({ ...none, gameChangers: ['A', 'B', 'C', 'D', 'A'] })).toMatchObject({
      minimum: 4,
      reasons: [{ code: 'game_changers', count: 4 }],
    });
  });
  it('MLD, turnos extras encadeados e combos', () => {
    expect(estimateBracket({ ...none, massLandDenial: ['Armageddon'] }).minimum).toBe(4);
    expect(estimateBracket({ ...none, extraTurns: ['Time Warp'] }).minimum).toBe(2);
    expect(estimateBracket({ ...none, extraTurns: ['A', 'B', 'C'] }).minimum).toBe(4);
    const combo = { id: 'x', cards: ['A', 'B'], produces: ['Win the game'] };
    expect(
      estimateBracket({ ...none, combos: [{ ...combo, twoCard: false, arguablyTwoCard: true }] })
        .minimum,
    ).toBe(3);
    expect(
      estimateBracket({ ...none, combos: [{ ...combo, twoCard: true, arguablyTwoCard: true }] }),
    ).toMatchObject({ minimum: 4, reasons: [{ code: 'two_card_combo', cards: ['A', 'B'] }] });
  });
});

describe('Commander Spellbook', () => {
  it('lê a classificação das cartas e os combos relevantes', async () => {
    const { fetchSpellbookSignals } = await import('./brackets');
    const card = (name: string) => ({ name, id: 1 });
    let sent: unknown;
    const fetchMock = async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return Response.json({
        bracketTag: 'R',
        cards: [
          {
            card: card('Demonic Tutor'),
            quantity: 1,
            gameChanger: true,
            massLandDenial: false,
            extraTurn: false,
          },
          {
            card: card('Armageddon'),
            quantity: 1,
            gameChanger: false,
            massLandDenial: true,
            extraTurn: false,
          },
          {
            card: card('Time Warp'),
            quantity: 1,
            gameChanger: false,
            massLandDenial: false,
            extraTurn: true,
          },
        ],
        combos: [
          {
            combo: {
              id: '742-1295',
              uses: [{ card: card("Thassa's Oracle") }, { card: card('Demonic Consultation') }],
              produces: [{ feature: { name: 'Win the game' }, quantity: 1 }],
            },
            relevant: true,
            definitelyTwoCard: true,
            arguablyTwoCard: true,
          },
          { combo: { id: 'z', uses: [], produces: [] }, relevant: false },
        ],
      });
    };
    const signals = await fetchSpellbookSignals(
      { commanders: ['Tasigur, the Golden Fang'], main: [{ name: 'Demonic Tutor', quantity: 1 }] },
      fetchMock,
    );
    expect(sent).toEqual({
      commanders: [{ card: 'Tasigur, the Golden Fang', quantity: 1 }],
      main: [{ card: 'Demonic Tutor', quantity: 1 }],
    });
    expect(signals).toEqual({
      gameChangers: ['Demonic Tutor'],
      massLandDenial: ['Armageddon'],
      extraTurns: ['Time Warp'],
      combos: [
        {
          id: '742-1295',
          cards: ["Thassa's Oracle", 'Demonic Consultation'],
          produces: ['Win the game'],
          twoCard: true,
          arguablyTwoCard: true,
        },
      ],
    });
    await expect(
      fetchSpellbookSignals(
        { commanders: [], main: [] },
        async () => new Response('x', { status: 500 }),
      ),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });
});

describe('hash da lista', () => {
  it('ignora ordem e caixa, muda com a quantidade', async () => {
    const { deckListHash, spellbookDeck } = await import('./brackets');
    const a = spellbookDeck([
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
      { name: 'Omnath', quantity: 1, board: 'commander' },
      { name: 'Forest', quantity: 30, board: 'mainboard' },
      { name: 'Opt', quantity: 1, board: 'maybeboard' },
    ]);
    expect(a).toEqual({
      commanders: ['Omnath'],
      main: [
        { name: 'Sol Ring', quantity: 1 },
        { name: 'Forest', quantity: 30 },
      ],
    });
    const b = { commanders: ['omnath'], main: [...a.main].reverse() };
    expect(deckListHash(a)).toBe(deckListHash({ ...b, commanders: ['Omnath'] }));
    expect(deckListHash(a)).not.toBe(
      deckListHash({ ...a, main: [{ name: 'Forest', quantity: 29 }, a.main[0]!] }),
    );
  });
});
