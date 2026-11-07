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

const IMAGE_HEADERS = {
  // O Scryfall pede User-Agent e Accept identificáveis; sem eles o CDN pode recusar.
  'User-Agent': 'ArcanaKin/1.0 (+https://github.com/fernandolobao/boramarcar)',
  Accept: 'image/jpeg,image/png;q=0.9,*/*;q=0.5',
};

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b: Uint8Array) =>
  b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/** Tamanhos a tentar: "large" para impressão e, se falhar, "normal". */
const candidates = (url: string) =>
  [url, url.replace('/large/', '/normal/')].filter((u, i, all) => all.indexOf(u) === i);

/**
 * Baixa as imagens com no máximo `limit` pedidos ao mesmo tempo (educação com o Scryfall).
 * Aceita só JPEG/PNG de verdade (confere os bytes), tenta o tamanho "normal" se o "large" falhar
 * e registra no log o motivo de cada falha.
 */
async function fetchImages(urls: string[], fetchFn: typeof fetch, limit = 6) {
  const result = new Map<string, Uint8Array | null>();
  const queue = [...new Set(urls)];
  const failures: string[] = [];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      let bytes: Uint8Array | null = null;
      for (const candidate of candidates(url)) {
        try {
          const response = await fetchFn(candidate, {
            headers: IMAGE_HEADERS,
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) {
            failures.push(`${response.status} ${candidate}`);
            continue;
          }
          const data = new Uint8Array(await response.arrayBuffer());
          if (isJpeg(data) || isPng(data)) {
            bytes = data;
            break;
          }
          failures.push(`formato desconhecido ${candidate}`);
        } catch (error) {
          failures.push(`${String(error)} ${candidate}`);
        }
      }
      result.set(url, bytes);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
  if (failures.length) {
    console.warn(`[proxies] ${failures.length} falha(s) ao baixar imagens`, failures.slice(0, 5));
  }
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
  pdf.setCreator('ArcanaKin');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bytes = await fetchImages(
    items.flatMap((i) => (i.imageUri ? [i.imageUri] : [])),
    fetchFn,
  );
  const embedded = new Map<string, PDFImage | null>();
  for (const [url, data] of bytes) {
    if (!data) {
      embedded.set(url, null);
      continue;
    }
    const image = await (isPng(data) ? pdf.embedPng(data) : pdf.embedJpg(data)).catch(
      (error: unknown) => {
        console.warn('[proxies] imagem inválida', url, error);
        return null;
      },
    );
    embedded.set(url, image);
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

  const missingImages = items.filter((i) => !i.imageUri || !embedded.get(i.imageUri)).length;
  return { pdf: await pdf.save(), cards: items.length, pages: pages.length, missingImages };
}
