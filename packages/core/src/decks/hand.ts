import type { DeckBoard } from './types';

/**
 * Testar a mão inicial (11.3): monta o grimório do deck, compra a mão de 7, faz o mulligan de
 * Londres e compra as próximas. (As chances de terrenos ficam na análise: `analysis/mana.ts`.)
 * Só o deck principal entra no grimório: comandante,
 * reserva e "talvez" ficam de fora.
 */
export interface HandCard {
  /** Único por cópia (para escolher qual vai ao fundo quando há cartas iguais). */
  id: string;
  name: string;
  isLand: boolean;
  imageUri: string | null;
}

export interface HandState {
  hand: HandCard[];
  library: HandCard[];
}

export const OPENING_HAND_SIZE = 7;

/** Uma cópia por carta do deck principal. */
export function buildLibrary(
  lines: readonly {
    name: string;
    board: DeckBoard;
    quantity: number;
    isLand: boolean;
    imageUri: string | null;
  }[],
): HandCard[] {
  const library: HandCard[] = [];
  lines.forEach((line, i) => {
    if (line.board !== 'mainboard') return;
    for (let copy = 0; copy < line.quantity; copy++) {
      library.push({
        id: `${i}-${copy}`,
        name: line.name,
        isLand: line.isLand,
        imageUri: line.imageUri,
      });
    }
  });
  return library;
}

/** Embaralha (Fisher–Yates) sem mexer na lista original. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Embaralha o grimório e compra 7. */
export function drawOpening(library: readonly HandCard[], random?: () => number): HandState {
  const shuffled = shuffle(library, random);
  return { hand: shuffled.slice(0, OPENING_HAND_SIZE), library: shuffled.slice(OPENING_HAND_SIZE) };
}

/**
 * Mulligan de Londres, depois de comprar 7 de novo: as cartas escolhidas (uma por mulligan) vão
 * para o fundo do grimório, na ordem escolhida.
 */
export function londonMulligan(state: HandState, bottomIds: readonly string[]): HandState {
  const bottom = bottomIds.map((id) => {
    const card = state.hand.find((c) => c.id === id);
    if (!card) throw new Error(`A carta ${id} não está na mão`);
    return card;
  });
  return {
    hand: state.hand.filter((c) => !bottomIds.includes(c.id)),
    library: [...state.library, ...bottom],
  };
}

/** Compra a próxima carta do grimório. */
export function drawNext(state: HandState): HandState {
  const [next, ...rest] = state.library;
  return next ? { hand: [...state.hand, next], library: rest } : state;
}
