/**
 * Layout por largura da tela (app): celular, tablet e tablet grande (ou deitado). As telas usam
 * a faixa para escolher colunas e a largura máxima do conteúdo, em vez de esticar uma coluna só
 * na largura do iPad.
 */
export type LayoutSize = 'compact' | 'medium' | 'expanded';

/** A partir daqui é tablet (iPad mini em pé tem 744 pt). */
export const TABLET_MIN_WIDTH = 600;
/** A partir daqui é tablet grande ou deitado (iPad deitado: 1080 pt ou mais). */
export const EXPANDED_MIN_WIDTH = 1024;
/** Largura máxima do conteúdo: além disso, sobra margem dos lados. */
export const CONTENT_MAX_WIDTH = 1200;

export interface LayoutInfo {
  size: LayoutSize;
  /** Tablet (em pé ou deitado): telas em duas colunas. */
  wide: boolean;
  /** Largura do conteúdo (centralizado). */
  contentWidth: number;
}

export function layoutFor(width: number): LayoutInfo {
  const size: LayoutSize =
    width >= EXPANDED_MIN_WIDTH ? 'expanded' : width >= TABLET_MIN_WIDTH ? 'medium' : 'compact';
  return { size, wide: size !== 'compact', contentWidth: Math.min(width, CONTENT_MAX_WIDTH) };
}

/**
 * Quantas colunas cabem numa largura, com item de no mínimo `min` pt e `gap` entre eles
 * (no máximo `max`, nunca menos que 1).
 */
export function gridColumns(
  width: number,
  { min, max = Number.POSITIVE_INFINITY, gap = 8 }: { min: number; max?: number; gap?: number },
) {
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (min + gap))));
}
