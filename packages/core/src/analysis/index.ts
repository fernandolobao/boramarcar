import type { CardData, DeckBoard } from '../decks/types';
import { CARD_ROLES, classifyCard, isBasicLand, isLand, type CardRole } from './roles';

export * from './roles';

export interface AnalyzableCard {
  name: string;
  quantity: number;
  board: DeckBoard;
  isProxy?: boolean;
  card: CardData | null;
}

export const MANA_CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const;
export type ManaCurveBucket = (typeof MANA_CURVE_BUCKETS)[number];
export const COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ColorSymbol = (typeof COLORS)[number];

/** Metas de referência para Commander (inspiradas no "template" popular da comunidade). */
export const COMMANDER_TARGETS = {
  deckSize: 100,
  lands: { min: 36, max: 38 },
  ramp: 10,
  draw: 10,
  removal: 8,
  wipe: 2,
  averageCmc: { ideal: 3.0, max: 4.5 },
} as const;

export type ValidationIssue =
  | { code: 'deck_size'; expected: number; actual: number }
  | { code: 'no_commander' }
  | { code: 'too_many_commanders'; actual: number }
  | { code: 'not_singleton'; name: string; quantity: number }
  | { code: 'color_identity'; name: string }
  | { code: 'unknown_card'; name: string };

export type Suggestion =
  | { code: 'more_lands'; missing: number }
  | { code: 'fewer_lands'; extra: number }
  | { code: 'more_role'; role: CardRole; missing: number; scryfallQuery: string }
  | { code: 'lower_curve'; averageCmc: number };

export interface ScoreComponent {
  key: 'lands' | CardRole | 'curve';
  score: number;
  max: number;
  value: number;
}

export interface DeckAnalysis {
  totalCards: number;
  commanders: string[];
  colorIdentity: string[];
  lands: number;
  nonLands: number;
  averageCmc: number;
  manaCurve: Record<ManaCurveBucket, number>;
  colorPips: Record<ColorSymbol, number>;
  roles: Record<CardRole, number>;
  cardsByRole: Record<CardRole, string[]>;
  proxies: number;
  validation: ValidationIssue[];
  score: number;
  scoreBreakdown: ScoreComponent[];
  suggestions: Suggestion[];
}

const COLOR_ORDER = 'WUBRG';
const sortColors = (colors: Iterable<string>) =>
  [...new Set(colors)].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b));

/** Conta símbolos de mana colorida em um custo como `{2}{W}{U/B}`. */
export function countPips(manaCost: string | null | undefined): Record<ColorSymbol, number> {
  const pips: Record<ColorSymbol, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const [, symbol] of (manaCost ?? '').matchAll(/\{([^}]+)\}/g)) {
    for (const part of (symbol ?? '').split('/')) {
      if (part in pips) pips[part as ColorSymbol] += 1;
    }
  }
  return pips;
}

const curveBucket = (cmc: number): ManaCurveBucket =>
  cmc >= 7 ? '7+' : (String(Math.floor(cmc)) as ManaCurveBucket);

const ROLE_SCRYFALL_TAG: Record<CardRole, string> = {
  ramp: 'ramp',
  draw: 'card-advantage',
  removal: 'removal',
  wipe: 'sweeper',
};

/**
 * Monta uma busca do Scryfall para encontrar substitutos de uma função dentro da
 * identidade de cor do comandante. Ex.: `id<=wub otag:ramp f:commander cmc<=3`.
 */
export function buildReplacementQuery(
  role: CardRole,
  colorIdentity: readonly string[],
  maxCmc = 3,
): string {
  const identity = colorIdentity.length ? colorIdentity.join('').toLowerCase() : 'c';
  return `id<=${identity} otag:${ROLE_SCRYFALL_TAG[role]} f:commander cmc<=${maxCmc}`;
}

const ANY_NUMBER_RE = /a deck can have any number of cards named/i;

export function validateCommanderDeck(cards: readonly AnalyzableCard[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const inDeck = cards.filter((c) => c.board === 'commander' || c.board === 'mainboard');
  const commanders = inDeck.filter((c) => c.board === 'commander');
  const total = inDeck.reduce((sum, c) => sum + c.quantity, 0);

  if (total !== COMMANDER_TARGETS.deckSize) {
    issues.push({ code: 'deck_size', expected: COMMANDER_TARGETS.deckSize, actual: total });
  }
  const commanderCount = commanders.reduce((sum, c) => sum + c.quantity, 0);
  if (commanderCount === 0) issues.push({ code: 'no_commander' });
  if (commanderCount > 2) issues.push({ code: 'too_many_commanders', actual: commanderCount });

  const identity = new Set(commanders.flatMap((c) => c.card?.colorIdentity ?? []));
  const quantities = new Map<string, { name: string; quantity: number; card: CardData | null }>();
  for (const entry of inDeck) {
    const key = entry.name.toLowerCase();
    const current = quantities.get(key);
    quantities.set(key, {
      name: entry.name,
      quantity: (current?.quantity ?? 0) + entry.quantity,
      card: entry.card,
    });
  }

  for (const { name, quantity, card } of quantities.values()) {
    if (!card) {
      issues.push({ code: 'unknown_card', name });
      continue;
    }
    const unlimited = isBasicLand(card) || ANY_NUMBER_RE.test(card.oracleText ?? '');
    if (quantity > 1 && !unlimited) issues.push({ code: 'not_singleton', name, quantity });
    if (commanderCount > 0 && card.colorIdentity.some((color) => !identity.has(color))) {
      issues.push({ code: 'color_identity', name });
    }
  }
  return issues;
}

const ratio = (value: number, target: number) => Math.min(1, target > 0 ? value / target : 1);

/** Analisa um deck de Commander: curva, cores, funções, validação, nota e sugestões. */
export function analyzeDeck(cards: readonly AnalyzableCard[]): DeckAnalysis {
  const inDeck = cards.filter((c) => c.board === 'commander' || c.board === 'mainboard');
  const manaCurve = Object.fromEntries(MANA_CURVE_BUCKETS.map((b) => [b, 0])) as Record<
    ManaCurveBucket,
    number
  >;
  const colorPips: Record<ColorSymbol, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const roles = Object.fromEntries(CARD_ROLES.map((r) => [r, 0])) as Record<CardRole, number>;
  const cardsByRole = Object.fromEntries(CARD_ROLES.map((r) => [r, [] as string[]])) as Record<
    CardRole,
    string[]
  >;

  let lands = 0;
  let nonLands = 0;
  let cmcSum = 0;
  let proxies = 0;
  let totalCards = 0;

  for (const entry of inDeck) {
    totalCards += entry.quantity;
    if (entry.isProxy) proxies += entry.quantity;
    const card = entry.card;
    if (!card) continue;
    if (isLand(card)) {
      lands += entry.quantity;
      continue;
    }
    nonLands += entry.quantity;
    if (entry.board === 'mainboard') {
      manaCurve[curveBucket(card.cmc)] += entry.quantity;
      cmcSum += card.cmc * entry.quantity;
    }
    const pips = countPips(card.manaCost);
    for (const color of COLORS) colorPips[color] += pips[color] * entry.quantity;
    for (const role of classifyCard(card)) {
      roles[role] += entry.quantity;
      cardsByRole[role].push(entry.name);
    }
  }

  const commanders = inDeck.filter((c) => c.board === 'commander');
  const colorIdentity = sortColors(commanders.flatMap((c) => c.card?.colorIdentity ?? []));
  const curveCards = Object.values(manaCurve).reduce((a, b) => a + b, 0);
  const averageCmc = curveCards ? Math.round((cmcSum / curveCards) * 100) / 100 : 0;

  const t = COMMANDER_TARGETS;
  const landDistance =
    lands < t.lands.min ? t.lands.min - lands : lands > t.lands.max ? lands - t.lands.max : 0;
  const curveScore =
    averageCmc <= t.averageCmc.ideal
      ? 1
      : Math.max(
          0,
          1 - (averageCmc - t.averageCmc.ideal) / (t.averageCmc.max - t.averageCmc.ideal),
        );

  const scoreBreakdown: ScoreComponent[] = [
    { key: 'lands', max: 25, value: lands, score: Math.max(0, 25 - landDistance * 3) },
    { key: 'ramp', max: 20, value: roles.ramp, score: 20 * ratio(roles.ramp, t.ramp) },
    { key: 'draw', max: 20, value: roles.draw, score: 20 * ratio(roles.draw, t.draw) },
    { key: 'removal', max: 15, value: roles.removal, score: 15 * ratio(roles.removal, t.removal) },
    { key: 'wipe', max: 10, value: roles.wipe, score: 10 * ratio(roles.wipe, t.wipe) },
    { key: 'curve', max: 10, value: averageCmc, score: 10 * curveScore },
  ].map((c) => ({ ...c, score: Math.round(c.score * 10) / 10 })) as ScoreComponent[];

  const score = Math.round(scoreBreakdown.reduce((sum, c) => sum + c.score, 0));

  const suggestions: Suggestion[] = [];
  if (lands < t.lands.min) suggestions.push({ code: 'more_lands', missing: t.lands.min - lands });
  if (lands > t.lands.max) suggestions.push({ code: 'fewer_lands', extra: lands - t.lands.max });
  const roleTargets: Record<CardRole, number> = {
    ramp: t.ramp,
    draw: t.draw,
    removal: t.removal,
    wipe: t.wipe,
  };
  for (const role of CARD_ROLES) {
    const missing = roleTargets[role] - roles[role];
    if (missing > 0) {
      suggestions.push({
        code: 'more_role',
        role,
        missing,
        scryfallQuery: buildReplacementQuery(role, colorIdentity),
      });
    }
  }
  if (averageCmc > t.averageCmc.ideal + 0.5) suggestions.push({ code: 'lower_curve', averageCmc });

  return {
    totalCards,
    commanders: commanders.map((c) => c.name),
    colorIdentity,
    lands,
    nonLands,
    averageCmc,
    manaCurve,
    colorPips,
    roles,
    cardsByRole,
    proxies,
    validation: validateCommanderDeck(cards),
    score,
    scoreBreakdown,
    suggestions,
  };
}
