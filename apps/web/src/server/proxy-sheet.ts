import 'server-only';
import {
  expandPrintList,
  MM_TO_PT,
  PAGE_MM,
  proxySheetLayout,
  toWinAnsi,
  type PageSize,
  type PrintableLine,
} from '@boramarcar/core';
import { PDFDocument, rgb, StandardFonts, type PDFImage } from 'pdf-lib';

/** Baixa as imagens com no máximo `limit` pedidos ao mesmo tempo (educação com o Scryfall). */
async function fetchImages(urls: string[], fetchFn: typeof fetch, limit = 6) {
  const result = new Map<string, Uint8Array | null>();
  const queue = [...new Set(urls)];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const response = await fetchFn(url, { headers: { Accept: 'image/jpeg' } });
        result.set(url, response.ok ? new Uint8Array(await response.arrayBuffer()) : null);
      } catch {
        result.set(url, null);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
  return result;
}

/**
 * Gera o PDF da folha de proxies: cartas 63×88 mm, 3×3 por página, com marcas de corte.
 * Carta sem imagem vira um retângulo com o nome (para não sumir da contagem).
 */
export async function buildProxySheet(
  input: {
    deckName: string;
    lines: readonly PrintableLine[];
    which: 'proxies' | 'all';
    page: PageSize;
  },
  fetchFn: typeof fetch = fetch,
) {
  const items = expandPrintList(input.lines, input.which);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Proxies — ${input.deckName}`);
  pdf.setCreator('Bora Marcar');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bytes = await fetchImages(
    items.flatMap((i) => (i.imageUri ? [i.imageUri] : [])),
    fetchFn,
  );
  const embedded = new Map<string, PDFImage | null>();
  for (const [url, data] of bytes) {
    embedded.set(url, data ? await pdf.embedJpg(data).catch(() => null) : null);
  }

  const size = PAGE_MM[input.page];
  const slots = proxySheetLayout(items.length, input.page);
  const pages: ReturnType<typeof pdf.addPage>[] = [];
  items.forEach((item, i) => {
    const slot = slots[i]!;
    const page =
      pages[slot.page] ??
      (pages[slot.page] = pdf.addPage([size.width * MM_TO_PT, size.height * MM_TO_PT]));
    const image = item.imageUri ? embedded.get(item.imageUri) : null;
    if (image) {
      page.drawImage(image, { x: slot.x, y: slot.y, width: slot.width, height: slot.height });
    } else {
      page.drawRectangle({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 1,
      });
      page.drawText(toWinAnsi(item.name), {
        x: slot.x + 8,
        y: slot.y + slot.height - 20,
        size: 9,
        font,
        maxWidth: slot.width - 16,
        lineHeight: 11,
      });
    }
  });

  // Marcas de corte nas bordas da grade, fora das cartas.
  for (const page of pages) {
    const pageSlots = slots.filter((s) => pages[s.page] === page);
    const xs = [...new Set(pageSlots.flatMap((s) => [s.x, s.x + s.width]))];
    const ys = [...new Set(pageSlots.flatMap((s) => [s.y, s.y + s.height]))];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const mark = 4 * MM_TO_PT;
    const line = { thickness: 0.5, color: rgb(0.4, 0.4, 0.4) };
    for (const x of xs) {
      page.drawLine({ start: { x, y: maxY + 1 }, end: { x, y: maxY + 1 + mark }, ...line });
      page.drawLine({ start: { x, y: minY - 1 }, end: { x, y: minY - 1 - mark }, ...line });
    }
    for (const y of ys) {
      page.drawLine({ start: { x: minX - 1, y }, end: { x: minX - 1 - mark, y }, ...line });
      page.drawLine({ start: { x: maxX + 1, y }, end: { x: maxX + 1 + mark, y }, ...line });
    }
  }

  return { pdf: await pdf.save(), cards: items.length, pages: pages.length };
}
