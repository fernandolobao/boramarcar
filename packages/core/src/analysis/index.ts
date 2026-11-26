import { outsideDeck, type CardData, type DeckBoard } from '../decks/types';
import { deckFormatProfile, type DeckFormatProfile } from './formats';
import { canPairCommanders } from './partners';
import { manaBase, openingHandOdds, type ColorSourceRow, type OpeningHandOdds } from './mana';
import {
  CARD_ROLES,
  cardRoles,
  isBasicLand,
  isLand,
  SCORED_ROLES,
  type CardRole,
  type ScoredRole,
} from './roles';

export * from './roles';
export * from './tagger';
export * from './brackets';
export * from './mana';
export * from './formats';
export * from './partners';
export * from './compare';

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
  | { code: 'deck_size_min'; min: number; actual: number }
  | { code: 'no_commander' }
  | { code: 'too_many_commanders'; actual: number; max: number }
  | { code: 'invalid_partners'; names: string }
  | { code: 'not_singleton'; name: string; quantity: number }
  | { code: 'too_many_copies'; name: string; quantity: number; max: number }
  | { code: 'sideboard_size'; max: number; actual: number }
  /** `colors`: as cores da carta que ficam fora da identidade do comandante (WUBRG). */
  | { code: 'color_identity'; name: string; colors: string[] }
  | { code: 'banned'; name: string }
  | { code: 'restricted'; name: string; quantity: number }
  | { code: 'not_legal'; name: string }
  | { code: 'unknown_card'; name: string };

const WUBRG = ['W', 'U', 'B', 'R', 'G'];

/**
 * Cores da identidade de uma carta que ficam fora da identidade do comandante (11.5), na ordem
 * WUBRG. Vazio = a carta cabe no deck (incolor cabe em qualquer um).
 */
export function outsideIdentity(
  cardIdentity: readonly string[],
  commanderIdentity: readonly string[],
): string[] {
  const allowed = new Set(commanderIdentity.map((c) => c.toUpperCase()));
  const out = new Set(cardIdentity.map((c) => c.toUpperCase()).filter((c) => !allowed.has(c)));
  return WUBRG.filter((c) => out.has(c));
}

export type Suggestion =
  | { code: 'more_lands'; missing: number }
  | { code: 'fewer_lands'; extra: number }
  | { code: 'more_role'; role: ScoredRole; missing: number; scryfallQuery: string }
  | { code: 'lower_curve'; averageCmc: number }
  | { code: 'more_interaction'; missing: number; scryfallQuery: string }
  | { code: 'low_consistency'; percent: number }
  | { code: 'more_creatures'; missing: number }
  | { code: 'fewer_creatures'; extra: number };

export interface ScoreComponent {
  key: 'lands' | ScoredRole | 'curve' | 'interaction' | 'consistency' | 'creatures';
  score: number;
  max: number;
  value: number;
  /** Meta usada no cálculo: faixa de terrenos, número de cartas da função ou CMC ideal/máximo. */
  target:
    | { min: number; max: number }
    | { count: number }
    | { ideal: number; max: number }
    | { percent: number };
  /** Faixas (terrenos, criaturas): pontos perdidos por unidade fora da faixa. */
  penalty?: number;
}

export interface DeckAnalysis {
  format: DeckFormatProfile['format'];
  kind: DeckFormatProfile['kind'];
  totalCards: number;
  commanders: string[];
  colorIdentity: string[];
  lands: number;
  nonLands: number;
  averageCmc: number;
  manaCurve: Record<ManaCurveBucket, number>;
  /** Cartas (não terrenos do principal) em cada faixa de custo, para o gráfico interativo. */
  cardsByCurve: Record<ManaCurveBucket, string[]>;
  colorPips: Record<ColorSymbol, number>;
  roles: Record<CardRole, number>;
  cardsByRole: Record<CardRole, string[]>;
  /** Cartas (não terrenos) com funções do Scryfall Tagger × total analisado. */
  rolesTagged: { tagged: number; total: number };
  proxies: number;
  /** Game Changers da lista oficial (dado do Scryfall). */
  gameChangers: string[];
  validation: ValidationIssue[];
  /** Nota de 0 a 100 (formatos com comandante, construídos e limitados; não no livre). */
  score: number | null;
  scoreBreakdown: ScoreComponent[];
  suggestions: Suggestion[];
  manaBase: ColorSourceRow[];
  /** Cartas sem os dados de legalidade (cache antigo): a lista de banidas não foi conferida nelas. */
  legalityMissing: number;
  /** Cartas que ainda não têm a informação de mana produzida (cache antigo). */
  manaDataMissing: number;
  handOdds: OpeningHandOdds | null;
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

export const ROLE_SCRYFALL_TAG: Record<CardRole, string> = {
  ramp: 'ramp',
  draw: 'card-advantage',
  removal: 'removal',
  wipe: 'sweeper',
  tutor: 'tutor',
  protection: 'protection',
  recursion: 'recursion',
  counterspell: 'counterspell',
};

/**
 * Monta uma busca do Scryfall para encontrar cartas de uma função dentro da identidade de cor
 * (e do formato, quando houver). Ex.: `id<=wub otag:ramp f:commander cmc<=3`.
 */
export function buildReplacementQuery(
  role: CardRole,
  colorIdentity: readonly string[],
  maxCmc = 3,
  scryfallFormat: string | null = 'commander',
): string {
  const identity = colorIdentity.length ? colorIdentity.join('').toLowerCase() : 'c';
  return [
    `id<=${identity}`,
    `otag:${ROLE_SCRYFALL_TAG[role]}`,
    scryfallFormat ? `f:${scryfallFormat}` : '',
    `cmc<=${maxCmc}`,
  ]
    .filter(Boolean)
    .join(' ');
}

const ANY_NUMBER_RE = /a deck can have any number of cards named/i;

/** Valida a lista contra as regras de montagem do formato. */
export function validateDeck(
  cards: readonly AnalyzableCard[],
  profile: DeckFormatProfile,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const inDeck = cards.filter((c) => c.board === 'commander' || c.board === 'mainboard');
  const commanders = inDeck.filter((c) => c.board === 'commander');
  const total = inDeck.reduce((sum, c) => sum + c.quantity, 0);

  const size = profile.deckSize;
  if (size && size.max === size.min && total !== size.min) {
    issues.push({ code: 'deck_size', expected: size.min, actual: total });
  } else if (size && total < size.min) {
    issues.push({ code: 'deck_size_min', min: size.min, actual: total });
  }
  const commanderCount = commanders.reduce((sum, c) => sum + c.quantity, 0);
  if (profile.commanders) {
    if (commanderCount === 0) issues.push({ code: 'no_commander' });
    if (commanderCount > profile.commanders.max) {
      issues.push({
        code: 'too_many_commanders',
        actual: commanderCount,
        max: profile.commanders.max,
      });
    } else if (commanderCount === 2 && profile.format !== 'oathbreaker') {
      // Dois comandantes só com Partner, "Partner with", "Partner—…", Background etc.
      const [a, b] = commanders.flatMap((c) => Array.from({ length: c.quantity }, () => c));
      if (a?.card && b?.card && !canPairCommanders(a.card, b.card)) {
        issues.push({ code: 'invalid_partners', names: `${a.name} + ${b.name}` });
      }
    }
  }
  if (profile.sideboardMax !== null) {
    const sideboard = cards
      .filter((c) => c.board === 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    if (sideboard > profile.sideboardMax) {
      issues.push({ code: 'sideboard_size', max: profile.sideboardMax, actual: sideboard });
    }
  }

  const identity = new Set(commanders.flatMap((c) => c.card?.colorIdentity ?? []));
  // Cópias contam principal + reserva (regra dos formatos construídos).
  const counted = cards.filter((c) => !outsideDeck(c.board));
  const quantities = new Map<
    string,
    { name: string; quantity: number; card: CardData | null; inDeck: boolean }
  >();
  for (const entry of counted) {
    const key = entry.name.toLowerCase();
    const current = quantities.get(key);
    const playing = entry.board === 'commander' || entry.board === 'mainboard';
    quantities.set(key, {
      name: entry.name,
      quantity: (current?.quantity ?? 0) + entry.quantity,
      card: current?.card ?? entry.card,
      inDeck: (current?.inDeck ?? false) || playing,
    });
  }

  for (const { name, quantity, card, inDeck: playing } of quantities.values()) {
    if (!card) {
      if (playing) issues.push({ code: 'unknown_card', name });
      continue;
    }
    const unlimited = isBasicLand(card) || ANY_NUMBER_RE.test(card.oracleText ?? '');
    if (profile.maxCopies !== null && quantity > profile.maxCopies && !unlimited) {
      issues.push(
        profile.maxCopies === 1
          ? { code: 'not_singleton', name, quantity }
          : { code: 'too_many_copies', name, quantity, max: profile.maxCopies },
      );
    }
    const outside = outsideIdentity(card.colorIdentity, [...identity]);
    if (profile.commanders && playing && commanderCount > 0 && outside.length) {
      issues.push({ code: 'color_identity', name, colors: outside });
    }
    // Lista de banidas/restritas do formato, pelos dados de legalidade do Scryfall.
    const legality = profile.scryfallFormat ? card.legalities?.[profile.scryfallFormat] : undefined;
    if (legality === 'banned') issues.push({ code: 'banned', name });
    else if (legality === 'restricted' && quantity > 1) {
      issues.push({ code: 'restricted', name, quantity });
    } else if (legality === 'not_legal' && !isBasicLand(card)) {
      issues.push({ code: 'not_legal', name });
    }
  }
  return issues;
}

/** Compatibilidade: validação de Commander. */
export const validateCommanderDeck = (cards: readonly AnalyzableCard[]) =>
  validateDeck(cards, deckFormatProfile('commander'));

/** Pontos máximos de cada função na nota (somam 65 com terrenos 25 e curva 10). */
export const ROLE_POINTS: Record<ScoredRole, number> = {
  ramp: 20,
  draw: 20,
  removal: 15,
  wipe: 10,
};

/** Construído: % das mágicas em 3–4 cópias para a nota cheia de consistência. */
export const CONSISTENCY_TARGET = 75;

const ratio = (value: number, target: number) => Math.min(1, target > 0 ? value / target : 1);

/**
 * Analisa um deck conforme o formato: curva, cores, funções, base de mana, chances da mão
 * inicial, validação e — nos formatos com comandante — nota e sugestões de funções.
 */
export function analyzeDeck(
  cards: readonly AnalyzableCard[],
  format: string = 'commander',
): DeckAnalysis {
  const profile = deckFormatProfile(format);
  const inDeck = cards.filter((c) => c.board === 'commander' || c.board === 'mainboard');
  const manaCurve = Object.fromEntries(MANA_CURVE_BUCKETS.map((b) => [b, 0])) as Record<
    ManaCurveBucket,
    number
  >;
  const cardsByCurve = Object.fromEntries(
    MANA_CURVE_BUCKETS.map((b) => [b, [] as string[]]),
  ) as Record<ManaCurveBucket, string[]>;
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
  let tagged = 0;
  let analyzed = 0;
  let manaDataMissing = 0;
  let creatures = 0;
  /** Cópias de cada mágica (não terreno) do principal, somando as versões (edições, foil). */
  const spellCopies = new Map<string, number>();
  let legalityMissing = 0;
  const gameChangers: string[] = [];

  for (const entry of inDeck) {
    totalCards += entry.quantity;
    if (entry.isProxy) proxies += entry.quantity;
    const card = entry.card;
    if (!card) continue;
    if (card.gameChanger && !gameChangers.includes(card.name)) gameChangers.push(card.name);
    if (card.producedMana == null) manaDataMissing += 1;
    if (card.legalities == null) legalityMissing += 1;
    if (isLand(card)) {
      lands += entry.quantity;
      continue;
    }
    nonLands += entry.quantity;
    if (entry.board === 'mainboard') {
      spellCopies.set(entry.name, (spellCopies.get(entry.name) ?? 0) + entry.quantity);
      if (/\bCreature\b/.test(card.typeLine)) creatures += entry.quantity;
      manaCurve[curveBucket(card.cmc)] += entry.quantity;
      cardsByCurve[curveBucket(card.cmc)].push(entry.name);
      cmcSum += card.cmc * entry.quantity;
    }
    const pips = countPips(card.manaCost);
    for (const color of COLORS) colorPips[color] += pips[color] * entry.quantity;
    const result = cardRoles(card);
    analyzed += 1;
    if (result.tagged) tagged += 1;
    for (const role of result.roles) {
      roles[role] += entry.quantity;
      cardsByRole[role].push(entry.name);
    }
  }

  const commanders = inDeck.filter((c) => c.board === 'commander');
  const colorIdentity = sortColors(
    (profile.commanders && commanders.length ? commanders : inDeck).flatMap(
      (c) => c.card?.colorIdentity ?? [],
    ),
  );
  const curveCards = Object.values(manaCurve).reduce((a, b) => a + b, 0);
  const averageCmc = curveCards ? Math.round((cmcSum / curveCards) * 100) / 100 : 0;

  const scoreBreakdown: ScoreComponent[] = [];
  let score: number | null = null;
  const suggestions: Suggestion[] = [];
  const landTarget = profile.lands;
  if (landTarget && lands < landTarget.min) {
    suggestions.push({ code: 'more_lands', missing: landTarget.min - lands });
  }
  if (landTarget && lands > landTarget.max) {
    suggestions.push({ code: 'fewer_lands', extra: lands - landTarget.max });
  }

  if (profile.roleTargets && landTarget && profile.averageCmc) {
    const targets = profile.roleTargets;
    const cmc = profile.averageCmc;
    const landDistance =
      lands < landTarget.min
        ? landTarget.min - lands
        : lands > landTarget.max
          ? lands - landTarget.max
          : 0;
    const curveScore =
      averageCmc <= cmc.ideal
        ? 1
        : Math.max(0, 1 - (averageCmc - cmc.ideal) / (cmc.max - cmc.ideal));
    scoreBreakdown.push(
      ...(
        [
          {
            key: 'lands',
            max: 25,
            value: lands,
            score: Math.max(0, 25 - landDistance * 3),
            target: { min: landTarget.min, max: landTarget.max },
            penalty: 3,
          },
          ...SCORED_ROLES.map((role) => ({
            key: role,
            max: ROLE_POINTS[role],
            value: roles[role],
            score: ROLE_POINTS[role] * ratio(roles[role], targets[role]),
            target: { count: targets[role] },
          })),
          {
            key: 'curve',
            max: 10,
            value: averageCmc,
            score: 10 * curveScore,
            target: { ideal: cmc.ideal, max: cmc.max },
          },
        ] as ScoreComponent[]
      ).map((c) => ({ ...c, score: Math.round(c.score * 10) / 10 })),
    );
    score = Math.round(scoreBreakdown.reduce((sum, c) => sum + c.score, 0));
    for (const role of SCORED_ROLES) {
      const missing = targets[role] - roles[role];
      if (missing > 0) {
        suggestions.push({
          code: 'more_role',
          role,
          missing,
          scryfallQuery: buildReplacementQuery(role, colorIdentity, 3, profile.scryfallFormat),
        });
      }
    }
    if (averageCmc > cmc.ideal + 0.5) suggestions.push({ code: 'lower_curve', averageCmc });
  }

  // Formatos sem comandante (60 e 40 cartas): terrenos 30, curva 30, interação 20 e
  // consistência (60: mágicas em 3–4 cópias) ou criaturas (40) 20.
  if (profile.interaction !== null && landTarget && profile.averageCmc) {
    const cmc = profile.averageCmc;
    const landDistance =
      lands < landTarget.min
        ? landTarget.min - lands
        : lands > landTarget.max
          ? lands - landTarget.max
          : 0;
    const curveScore =
      averageCmc <= cmc.ideal
        ? 1
        : Math.max(0, 1 - (averageCmc - cmc.ideal) / (cmc.max - cmc.ideal));
    const interaction = roles.removal + roles.wipe;
    const parts: ScoreComponent[] = [
      {
        key: 'lands',
        max: 30,
        value: lands,
        score: Math.max(0, 30 - landDistance * 5),
        target: { min: landTarget.min, max: landTarget.max },
        penalty: 5,
      },
      {
        key: 'curve',
        max: 30,
        value: averageCmc,
        score: 30 * curveScore,
        target: { ideal: cmc.ideal, max: cmc.max },
      },
      {
        key: 'interaction',
        max: 20,
        value: interaction,
        score: 20 * ratio(interaction, profile.interaction),
        target: { count: profile.interaction },
      },
    ];
    if (profile.creatures) {
      const range = profile.creatures;
      const distance =
        creatures < range.min
          ? range.min - creatures
          : creatures > range.max
            ? creatures - range.max
            : 0;
      parts.push({
        key: 'creatures',
        max: 20,
        value: creatures,
        score: Math.max(0, 20 - distance * 4),
        target: { min: range.min, max: range.max },
        penalty: 4,
      });
    } else {
      const totalSpells = [...spellCopies.values()].reduce((a, b) => a + b, 0);
      const steady = [...spellCopies.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0);
      const share = totalSpells ? (steady / totalSpells) * 100 : 0;
      parts.push({
        key: 'consistency',
        max: 20,
        value: Math.round(share),
        score: 20 * ratio(share, CONSISTENCY_TARGET),
        target: { percent: CONSISTENCY_TARGET },
      });
    }
    scoreBreakdown.push(...parts.map((c) => ({ ...c, score: Math.round(c.score * 10) / 10 })));
    score = Math.round(scoreBreakdown.reduce((sum, c) => sum + c.score, 0));
    if (interaction < profile.interaction) {
      suggestions.push({
        code: 'more_interaction',
        missing: profile.interaction - interaction,
        scryfallQuery: buildReplacementQuery('removal', colorIdentity, 3, profile.scryfallFormat),
      });
    }
    const consistency = scoreBreakdown.find((c) => c.key === 'consistency');
    if (consistency && consistency.value < CONSISTENCY_TARGET) {
      suggestions.push({ code: 'low_consistency', percent: consistency.value });
    }
    if (profile.creatures && creatures < profile.creatures.min) {
      suggestions.push({ code: 'more_creatures', missing: profile.creatures.min - creatures });
    }
    if (profile.creatures && creatures > profile.creatures.max) {
      suggestions.push({ code: 'fewer_creatures', extra: creatures - profile.creatures.max });
    }
    if (averageCmc > cmc.ideal + 0.5) suggestions.push({ code: 'lower_curve', averageCmc });
  }

  // Comandantes ficam na zona de comando: o grimório é o resto da lista principal.
  const library = inDeck
    .filter((c) => c.board === 'mainboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  const libraryLands = inDeck
    .filter((c) => c.board === 'mainboard' && c.card && isLand(c.card))
    .reduce((sum, c) => sum + c.quantity, 0);

  return {
    format: profile.format,
    kind: profile.kind,
    totalCards,
    commanders: commanders.map((c) => c.name),
    colorIdentity,
    lands,
    nonLands,
    averageCmc,
    manaCurve,
    cardsByCurve,
    colorPips,
    roles,
    cardsByRole,
    rolesTagged: { tagged, total: analyzed },
    proxies,
    gameChangers,
    validation: validateDeck(cards, profile),
    score,
    scoreBreakdown,
    suggestions,
    manaBase: manaBase({
      pips: colorPips,
      deckSize: totalCards,
      cards: inDeck
        .filter((c) => c.board === 'mainboard' && c.card)
        .map((c) => ({
          quantity: c.quantity,
          isLand: isLand(c.card!),
          producedMana: c.card!.producedMana,
        })),
    }),
    manaDataMissing,
    legalityMissing,
    handOdds:
      library >= 7 ? openingHandOdds({ library, lands: libraryLands, ramp: roles.ramp }) : null,
  };
}
