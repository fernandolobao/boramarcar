/** Matemática de mana (4.8 e 4.9): base de mana por cor e chances da mão inicial. */

/** Combinação C(n, k) em ponto flutuante (suficiente para decks de até 250 cartas). */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/** P(X = k): k sucessos ao comprar `draws` cartas de `population` com `successes` sucessos. */
export function hypergeometric(population: number, successes: number, draws: number, k: number) {
  return (
    (choose(successes, k) * choose(population - successes, draws - k)) / choose(population, draws)
  );
}

/** P(X ≥ k). */
export function atLeast(population: number, successes: number, draws: number, k: number) {
  let p = 0;
  for (let i = k; i <= Math.min(draws, successes); i++) {
    p += hypergeometric(population, successes, draws, i);
  }
  return Math.min(1, Math.max(0, p));
}

export interface OpeningHandOdds {
  /** Cartas no grimório (sem o comandante). */
  library: number;
  lands: number;
  /** P(exatamente k terrenos na mão de 7), k = 0…7. */
  distribution: number[];
  /** P(2 a 4 terrenos na mão inicial) — a mão "mantível" mais comum. */
  keepable: number;
  expectedLands: number;
  /** P(ter feito a jogada de terreno de todos os turnos até t), jogando primeiro e segundo. */
  landDrops: { turn: number; onPlay: number; onDraw: number }[];
  /** P(ter ao menos uma carta de "ramp" até o turno 2 / 3, na compra). */
  rampByTurn: { turn: number; onDraw: number }[];
}

export function openingHandOdds(input: {
  library: number;
  lands: number;
  ramp?: number;
  handSize?: number;
}): OpeningHandOdds {
  const hand = input.handSize ?? 7;
  const { library, lands } = input;
  const distribution = Array.from({ length: hand + 1 }, (_, k) =>
    hypergeometric(library, lands, hand, k),
  );
  const keepable = distribution.slice(2, 5).reduce((a, b) => a + b, 0);
  const seen = (turn: number, onPlay: boolean) => Math.min(library, hand + turn - (onPlay ? 1 : 0));
  return {
    library,
    lands,
    distribution,
    keepable,
    expectedLands: (hand * lands) / library,
    landDrops: [2, 3, 4, 5].map((turn) => ({
      turn,
      onPlay: atLeast(library, lands, seen(turn, true), turn),
      onDraw: atLeast(library, lands, seen(turn, false), turn),
    })),
    rampByTurn: [2, 3].map((turn) => ({
      turn,
      onDraw: atLeast(library, input.ramp ?? 0, seen(turn, false), 1),
    })),
  };
}

export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

export interface ManaBaseCard {
  quantity: number;
  isLand: boolean;
  /** Cores que produz (do Scryfall). */
  producedMana: readonly string[] | null | undefined;
}

export interface ColorSourceRow {
  color: ManaColor;
  pips: number;
  share: number;
  landSources: number;
  otherSources: number;
  recommended: number;
  /** `unknown`: faltam fontes, mas há terrenos sem o dado de mana produzida. */
  status: 'ok' | 'low' | 'unknown';
}

/**
 * Fontes de mana por cor × símbolos (4.8). A recomendação é proporcional à fatia de símbolos
 * da cor sobre os terrenos do deck, com um mínimo para cores de "splash" (10 em decks de
 * Commander, 7 em decks de 60): uma heurística simples, explicada na tela.
 */
export function manaBase(input: {
  pips: Record<string, number>;
  cards: readonly ManaBaseCard[];
  deckSize: number;
}): ColorSourceRow[] {
  const used = MANA_COLORS.filter((c) => (input.pips[c] ?? 0) > 0);
  const totalPips = used.reduce((s, c) => s + input.pips[c]!, 0);
  const lands = input.cards.filter((c) => c.isLand).reduce((s, c) => s + c.quantity, 0);
  const minimum = input.deckSize >= 90 ? 10 : 7;
  const unknownLands = input.cards.some((c) => c.isLand && c.producedMana == null);
  return used.map((color) => {
    const produces = (c: ManaBaseCard) => (c.producedMana ?? []).includes(color);
    const landSources = input.cards
      .filter((c) => c.isLand && produces(c))
      .reduce((s, c) => s + c.quantity, 0);
    const otherSources = input.cards
      .filter((c) => !c.isLand && produces(c))
      .reduce((s, c) => s + c.quantity, 0);
    const share = totalPips ? input.pips[color]! / totalPips : 0;
    const recommended = Math.min(lands, Math.max(minimum, Math.round(lands * share)));
    return {
      color,
      pips: input.pips[color]!,
      share,
      landSources,
      otherSources,
      recommended,
      status: landSources >= recommended ? 'ok' : unknownLands ? 'unknown' : 'low',
    };
  });
}
