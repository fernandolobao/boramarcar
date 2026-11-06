/** Folha de impressão de proxies (3.10): cartas em tamanho real, 3×3 por página. */

/** Tamanho oficial da carta: 63 × 88 mm. */
export const CARD_MM = { width: 63, height: 88 } as const;
export const PAGE_MM = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
} as const;
export type PageSize = keyof typeof PAGE_MM;

export const MM_TO_PT = 72 / 25.4;

export interface SheetSlot {
  page: number;
  /** Canto inferior esquerdo, em pontos (origem do PDF), e tamanho. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Posição de cada carta: grade 3×3 centralizada na página, sem espaço entre as cartas
 * (um corte só separa duas vizinhas). Coordenadas em pontos PDF.
 */
export function proxySheetLayout(count: number, page: PageSize = 'a4', gapMm = 0): SheetSlot[] {
  const size = PAGE_MM[page];
  const cols = 3;
  const rows = 3;
  const gridW = cols * CARD_MM.width + (cols - 1) * gapMm;
  const gridH = rows * CARD_MM.height + (rows - 1) * gapMm;
  const left = (size.width - gridW) / 2;
  const top = (size.height - gridH) / 2;
  return Array.from({ length: count }, (_, i) => {
    const inPage = i % (cols * rows);
    const col = inPage % cols;
    const row = Math.floor(inPage / cols);
    const xMm = left + col * (CARD_MM.width + gapMm);
    const yTopMm = top + row * (CARD_MM.height + gapMm);
    return {
      page: Math.floor(i / (cols * rows)),
      x: xMm * MM_TO_PT,
      // PDF mede de baixo para cima.
      y: (size.height - yTopMm - CARD_MM.height) * MM_TO_PT,
      width: CARD_MM.width * MM_TO_PT,
      height: CARD_MM.height * MM_TO_PT,
    };
  });
}

export interface PrintableLine {
  name: string;
  quantity: number;
  proxies: number;
  card: { imageUri?: string | null } | null;
}

/** Uma entrada por cópia a imprimir: só proxies (padrão) ou o deck todo. */
export function expandPrintList(
  lines: readonly PrintableLine[],
  which: 'proxies' | 'all' = 'proxies',
) {
  return lines.flatMap((line) =>
    Array.from({ length: which === 'proxies' ? line.proxies : line.quantity }, () => ({
      name: line.name,
      imageUri: line.card?.imageUri ? printImageUrl(line.card.imageUri) : null,
    })),
  );
}

/** Imagem "large" do Scryfall (672×936), boa para impressão em tamanho real. */
export const printImageUrl = (imageUri: string) =>
  imageUri
    .replace(/\/(small|normal|png|border_crop|art_crop)\//, '/large/')
    .replace(/\.png(\?|$)/, '.jpg$1');

/** Texto seguro para as fontes padrão do PDF (WinAnsi): troca o que não couber por "?". */
export const toWinAnsi = (text: string) =>
  text.normalize('NFC').replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, '?');
