import { createTestDb } from '@boramarcar/db/testing';
import type { Database } from '@boramarcar/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { lookupScannedCard } from './card-scan';

vi.mock('server-only', () => ({}));

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const card = (name: string, extra: Record<string, unknown> = {}) => ({
  id: `id-${name}`,
  name,
  cmc: 2,
  type_line: 'Creature',
  color_identity: [],
  set: 'tst',
  collector_number: '1',
  ...extra,
});
const lines = (text: string) =>
  text.split('\n').map((t, i, all) => ({ text: t, top: i / all.length }));

describe('busca da carta lida pela câmera', () => {
  it('nome aproximado só vale se parecido com o lido ("Giant" não vale por "Doomwake Gian")', async () => {
    const text =
      'Sf. Ode ee\nke Giant 4 ia\n% Doomwake Gian SS [dd\nEnchantment Creature — Giant\nx\ny\nz\nw\nv\nu';
    const fetchMock = vi.fn(async (url: string) => {
      const q = decodeURIComponent(url.split('fuzzy=')[1] ?? '');
      if (q.startsWith('Doomwake')) return Response.json(card('Doomwake Giant'));
      if (q === 'Giant') return Response.json(card('Giant'));
      return new Response('{}', { status: 404 });
    });
    const { match } = await lookupScannedCard(
      db,
      { text, lines: lines(text), nameZone: 0.4 },
      fetchMock,
    );
    expect(match).toMatchObject({ how: 'name', card: { name: 'Doomwake Giant' } });
  });

  it('carta em português pelo nome impresso', async () => {
    const text =
      '| Lancadora dos Mil Luas Lt | |\nCriatura — Humano Soldado\na\nb\nc\nd\ne\nf\ng\nh';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/cards/search')) {
        return Response.json({
          data: [
            {
              name: 'Thousand Moons Crackshot',
              printed_name: 'Lançadora dos Mil Luas',
              lang: 'pt',
            },
          ],
        });
      }
      if (url.includes('/cards/collection')) {
        return Response.json({ data: [card('Thousand Moons Crackshot')], not_found: [] });
      }
      return new Response('{}', { status: 404 });
    });
    const { match } = await lookupScannedCard(
      db,
      { text, lines: lines(text), nameZone: 0.22 },
      fetchMock,
    );
    expect(match).toMatchObject({
      how: 'printed',
      printedName: 'Lançadora dos Mil Luas',
      card: { name: 'Thousand Moons Crackshot' },
    });
  });

  it('edição + número sem conferir o nome só como último recurso', async () => {
    const text = 'Stade Sam Rutherford\nArtifact\nU 0499\nTRC • EN Hector Ortiz';
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/cards/trc/499')
        ? Response.json(card('Sol Ring'))
        : new Response('{}', { status: 404 }),
    );
    const { match } = await lookupScannedCard(
      db,
      { text, lines: lines(text), nameZone: 1 },
      fetchMock,
    );
    expect(match).toMatchObject({ how: 'set-unverified', card: { name: 'Sol Ring' } });
  });

  it('Scryfall fora do ar: nada achado, sem erro', async () => {
    const text = 'Sol Ring\nTRC • EN';
    const { match } = await lookupScannedCard(
      db,
      { text, lines: lines(text), nameZone: 1 },
      async () => {
        throw new Error('ENOTFOUND');
      },
    );
    expect(match).toBeNull();
  });
});
