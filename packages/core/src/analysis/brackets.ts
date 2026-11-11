import { z } from 'zod';
import { DomainError } from '../errors';
import type { FetchLike } from '../decks/types';
import { EXTERNAL_TIMEOUT_MS, withTimeout } from '../external';

/** API pública do Commander Spellbook (combos e classificação de cartas). */
export const SPELLBOOK_API = 'https://backend.commanderspellbook.com';

export const BRACKETS = [1, 2, 3, 4, 5] as const;
export type Bracket = (typeof BRACKETS)[number];

export interface ComboInfo {
  id: string;
  cards: string[];
  produces: string[];
  /** Combo de duas cartas sem dúvida (ex.: Thassa's Oracle + Demonic Consultation). */
  twoCard: boolean;
  /** Pode ser considerado de duas cartas (ex.: precisa de algo comum além delas). */
  arguablyTwoCard: boolean;
}

export interface BracketSignals {
  gameChangers: string[];
  massLandDenial: string[];
  extraTurns: string[];
  combos: ComboInfo[];
}

export type BracketReason =
  | { code: 'game_changers'; count: number; cards: string[] }
  | { code: 'mass_land_denial'; cards: string[] }
  | { code: 'extra_turns'; cards: string[]; chained: boolean }
  | { code: 'two_card_combo'; cards: string[]; produces: string[] }
  | { code: 'arguable_combo'; cards: string[]; produces: string[] }
  | { code: 'clean' };

export interface BracketEstimate {
  /** Menor bracket em que o deck cabe pelas regras objetivas (4 = 4 ou 5). */
  minimum: 2 | 3 | 4;
  reasons: BracketReason[];
}

/**
 * Estima o bracket de Commander (4.7) pelas regras oficiais que dá para verificar na lista
 * (atualização de out/2025): Game Changers (nenhum até o 2; até 3 no 3), destruição em massa de
 * terrenos (só 4+), turnos extras (poucos e não encadeados até o 3) e combos de duas cartas
 * (nenhum até o 2; nada de combo cedo no 3). Intenção e velocidade de jogo ficam com o grupo:
 * por isso o resultado é um mínimo, não um veredito (1 × 2 e 4 × 5 dependem da intenção).
 */
export function estimateBracket(signals: BracketSignals): BracketEstimate {
  const reasons: BracketReason[] = [];
  let minimum: 2 | 3 | 4 = 2;
  const raise = (to: 3 | 4) => {
    if (to > minimum) minimum = to;
  };

  const gc = [...new Set(signals.gameChangers)];
  if (gc.length) {
    reasons.push({ code: 'game_changers', count: gc.length, cards: gc });
    raise(gc.length > 3 ? 4 : 3);
  }
  if (signals.massLandDenial.length) {
    reasons.push({ code: 'mass_land_denial', cards: [...new Set(signals.massLandDenial)] });
    raise(4);
  }
  const turns = [...new Set(signals.extraTurns)];
  if (turns.length) {
    const chained = turns.length >= 3;
    reasons.push({ code: 'extra_turns', cards: turns, chained });
    if (chained) raise(4);
  }
  for (const combo of signals.combos) {
    if (combo.twoCard) {
      reasons.push({ code: 'two_card_combo', cards: combo.cards, produces: combo.produces });
      raise(4);
    } else if (combo.arguablyTwoCard) {
      reasons.push({ code: 'arguable_combo', cards: combo.cards, produces: combo.produces });
      raise(3);
    }
  }
  if (!reasons.length) reasons.push({ code: 'clean' });
  return { minimum, reasons };
}

const cardRef = z.object({ name: z.string() });
const spellbookSchema = z.object({
  bracketTag: z.string().optional(),
  cards: z.array(
    z.object({
      card: cardRef,
      gameChanger: z.boolean().default(false),
      massLandDenial: z.boolean().default(false),
      extraTurn: z.boolean().default(false),
    }),
  ),
  combos: z.array(
    z.object({
      combo: z.object({
        id: z.string(),
        uses: z.array(z.object({ card: cardRef })),
        produces: z
          .array(z.object({ feature: z.object({ name: z.string() }).optional() }).passthrough())
          .default([]),
      }),
      relevant: z.boolean().default(true),
      definitelyTwoCard: z.boolean().default(false),
      arguablyTwoCard: z.boolean().default(false),
    }),
  ),
});

/** Pede ao Commander Spellbook os combos e a classificação das cartas do deck. */
export async function fetchSpellbookSignals(
  deck: { commanders: readonly string[]; main: readonly { name: string; quantity: number }[] },
  fetchFn: FetchLike,
): Promise<BracketSignals> {
  const response = await withTimeout(
    fetchFn,
    EXTERNAL_TIMEOUT_MS.spellbook,
    'Commander Spellbook',
  )(`${SPELLBOOK_API}/estimate-bracket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      commanders: deck.commanders.map((card) => ({ card, quantity: 1 })),
      main: deck.main.map((c) => ({ card: c.name, quantity: c.quantity })),
    }),
  });
  if (!response.ok) {
    throw new DomainError('upstream_error', `Commander Spellbook respondeu ${response.status}`);
  }
  const parsed = spellbookSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new DomainError('upstream_error', 'Resposta inesperada do Commander Spellbook');
  }
  const { cards, combos } = parsed.data;
  return {
    gameChangers: cards.filter((c) => c.gameChanger).map((c) => c.card.name),
    massLandDenial: cards.filter((c) => c.massLandDenial).map((c) => c.card.name),
    extraTurns: cards.filter((c) => c.extraTurn).map((c) => c.card.name),
    combos: combos
      .filter((c) => c.relevant)
      .map((c) => ({
        id: c.combo.id,
        cards: c.combo.uses.map((u) => u.card.name),
        produces: c.combo.produces.flatMap((p) => (p.feature ? [p.feature.name] : [])),
        twoCard: c.definitelyTwoCard,
        arguablyTwoCard: c.arguablyTwoCard,
      })),
  };
}

/** Lista que vai para o Spellbook, a partir das entradas do deck (sem reserva/talvez). */
export function spellbookDeck(
  entries: readonly { name: string; quantity: number; board: string }[],
) {
  const main = new Map<string, number>();
  for (const e of entries) {
    if (e.board === 'mainboard') main.set(e.name, (main.get(e.name) ?? 0) + e.quantity);
  }
  return {
    commanders: [...new Set(entries.filter((e) => e.board === 'commander').map((e) => e.name))],
    main: [...main].map(([name, quantity]) => ({ name, quantity })),
  };
}

/** Hash (FNV-1a) da lista, para saber se os sinais guardados ainda valem. */
export function deckListHash(deck: ReturnType<typeof spellbookDeck>): string {
  const text = [
    ...deck.commanders.map((c) => `C:${c.toLowerCase()}`).sort(),
    ...deck.main.map((c) => `${c.quantity}:${c.name.toLowerCase()}`).sort(),
  ].join('\n');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const signalsSchema = z.object({
  gameChangers: z.array(z.string()),
  massLandDenial: z.array(z.string()),
  extraTurns: z.array(z.string()),
  combos: z.array(
    z.object({
      id: z.string(),
      cards: z.array(z.string()),
      produces: z.array(z.string()),
      twoCard: z.boolean(),
      arguablyTwoCard: z.boolean(),
    }),
  ),
});

/** Lê sinais guardados no banco (jsonb); `null` se o formato não bater. */
export const parseBracketSignals = (value: unknown): BracketSignals | null => {
  const parsed = signalsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
