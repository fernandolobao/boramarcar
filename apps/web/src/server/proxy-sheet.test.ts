import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { buildProxySheet } from './proxy-sheet';

const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAGAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDlaKKKg8I//9k=',
  'base64',
);

describe('folha de proxies em PDF', () => {
  it('3×3 por página, imagens grandes e cartas sem imagem com o nome', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('broken') ? new Response('x', { status: 404 }) : new Response(JPEG),
    );
    const { pdf, cards, pages } = await buildProxySheet(
      {
        deckName: 'Omnath Ramp',
        which: 'proxies',
        page: 'a4',
        lines: [
          {
            name: 'Forest',
            quantity: 12,
            proxies: 8,
            card: { imageUri: 'https://cards.scryfall.io/normal/front/f.jpg' },
          },
          {
            name: 'Sol Ring',
            quantity: 1,
            proxies: 1,
            card: { imageUri: 'https://cards.scryfall.io/normal/front/broken.jpg' },
          },
          { name: 'Lim-Dûl’s Vault', quantity: 1, proxies: 1, card: null },
          {
            name: 'Cultivate',
            quantity: 1,
            proxies: 0,
            card: { imageUri: 'https://cards.scryfall.io/normal/front/c.jpg' },
          },
        ],
      },
      fetchMock as unknown as typeof fetch,
    );
    expect(cards).toBe(10);
    expect(pages).toBe(2);
    // Cada imagem é baixada uma vez só, no tamanho "large".
    expect(fetchMock.mock.calls.map((c) => c[0]).sort()).toEqual([
      'https://cards.scryfall.io/large/front/broken.jpg',
      'https://cards.scryfall.io/large/front/f.jpg',
    ]);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo((210 * 72) / 25.4, 0);
    expect(height).toBeCloseTo((297 * 72) / 25.4, 0);
    expect(doc.getTitle()).toBe('Proxies — Omnath Ramp');
  });

  it('modo "todas" e papel Carta', async () => {
    const { cards, pages, pdf } = await buildProxySheet(
      {
        deckName: 'X',
        which: 'all',
        page: 'letter',
        lines: [{ name: 'Forest', quantity: 9, proxies: 0, card: null }],
      },
      vi.fn() as unknown as typeof fetch,
    );
    expect([cards, pages]).toEqual([9, 1]);
    expect((await PDFDocument.load(pdf)).getPage(0).getSize().width).toBeCloseTo(612, 0);
  });
});
