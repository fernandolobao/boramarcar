import { gridColumns, layoutFor } from '@boramarcar/ui';
import { useWindowDimensions } from 'react-native';

export { gridColumns };

/** Espaço dos lados do conteúdo (padding das telas). */
export const SCREEN_PADDING = 16;
/** Largura máxima de leitura (texto e formulários) no tablet. */
export const READABLE_MAX_WIDTH = 760;

/**
 * Faixa de largura da tela (celular, tablet, tablet grande) e a largura útil do conteúdo.
 * Acompanha o giro do aparelho (iPad em pé e deitado).
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const info = layoutFor(width);
  return {
    ...info,
    /** Largura útil, já sem o padding dos lados. */
    innerWidth: info.contentWidth - SCREEN_PADDING * 2,
    /** Estilo do contêiner das telas: largura máxima e centralizado no tablet. */
    contentStyle: {
      padding: SCREEN_PADDING,
      width: '100%',
      maxWidth: info.contentWidth,
      alignSelf: 'center',
    } as const,
    /** Telas de leitura e formulários (ranking, conta, ajuda): largura confortável, centralizada. */
    readableStyle: {
      padding: SCREEN_PADDING,
      width: '100%',
      maxWidth: Math.min(info.contentWidth, READABLE_MAX_WIDTH),
      alignSelf: 'center',
    } as const,
  };
}
