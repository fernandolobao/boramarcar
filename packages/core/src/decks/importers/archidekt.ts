import { z } from 'zod';
import { DomainError } from '../../errors';
import type { GameFormat } from '../../games';
import type { DeckBoard, DeckEntry, FetchLike, ImportedDeck } from '../types';
import { mergeDuplicates } from './text';
import { EXTERNAL_TIMEOUT_MS, withTimeout } from '../../external';

const archidektDeckSchema = z.object({
  id: z.number(),
  name: z.string(),
  deckFormat: z.number().nullish(),
  categories: z
    .array(
      z.object({
        name: z.string(),
        includedInDeck: z.boolean().optional(),
        isPremier: z.boolean().optional(),
      }),
    )
    .default([]),
  cards: z.array(
    z.object({
      quantity: z.number().int().positive(),
      categories: z.array(z.string()).nullable().default([]),
      modifier: z.string().optional(),
      /** Cartas removidas do deck continuam na resposta com `deletedAt` preenchido. */
      deletedAt: z.string().nullish(),
      card: z.object({
        uid: z.string().optional(),
        collectorNumber: z.string().optional(),
        edition: z.object({ editioncode: z.string() }).partial().optional(),
        oracleCard: z.object({ name: z.string() }),
      }),
    }),
  ),
});

/** Códigos de `deckFormat` do Archidekt que têm equivalente aqui. */
const ARCHIDEKT_FORMATS: Record<number, GameFormat> = {
  1: 'standard',
  2: 'modern',
  3: 'commander',
  4: 'legacy',
  5: 'vintage',
  6: 'pauper',
  13: 'brawl',
  14: 'oathbreaker',
  15: 'pioneer',
};

export type ArchidektDeckResponse = z.input<typeof archidektDeckSchema>;

/** Converte a resposta de `GET https://archidekt.com/api/decks/{id}/` em um deck importado. */
export function mapArchidektDeck(payload: unknown): ImportedDeck {
  const parsed = archidektDeckSchema.safeParse(payload);
  if (!parsed.success) {
    throw new DomainError(
      'upstream_error',
      'Resposta inesperada do Archidekt',
      parsed.error.issues,
    );
  }
  const deck = parsed.data;
  const categoryInfo = new Map(deck.categories.map((c) => [c.name.toLowerCase(), c]));

  const boardFor = (categories: string[]): DeckBoard | null => {
    const names = categories.map((c) => c.toLowerCase());
    if (names.includes('commander')) return 'commander';
    if (names.includes('sideboard')) return 'sideboard';
    if (names.includes('maybeboard')) return 'maybeboard';
    const primary = names[0];
    const info = primary ? categoryInfo.get(primary) : undefined;
    if (info && info.includedInDeck === false) return 'maybeboard';
    return 'mainboard';
  };

  const entries: DeckEntry[] = [];
  for (const item of deck.cards) {
    if (item.deletedAt) continue;
    const board = boardFor(item.categories ?? []);
    if (!board) continue;
    const entry: DeckEntry = { name: item.card.oracleCard.name, quantity: item.quantity, board };
    if (item.card.uid) entry.scryfallId = item.card.uid;
    if (item.card.edition?.editioncode) entry.setCode = item.card.edition.editioncode;
    if (item.card.collectorNumber) entry.collectorNumber = item.card.collectorNumber;
    if (item.modifier === 'Foil' || item.modifier === 'Etched') entry.isFoil = true;
    entries.push(entry);
  }

  return {
    name: deck.name,
    source: 'archidekt',
    sourceId: String(deck.id),
    sourceUrl: `https://archidekt.com/decks/${deck.id}`,
    ...(deck.deckFormat && ARCHIDEKT_FORMATS[deck.deckFormat]
      ? { format: ARCHIDEKT_FORMATS[deck.deckFormat] }
      : {}),
    entries: mergeDuplicates(entries),
  };
}

export async function fetchArchidektDeck(id: string, fetchFn: FetchLike): Promise<ImportedDeck> {
  const response = await withTimeout(
    fetchFn,
    EXTERNAL_TIMEOUT_MS.importer,
    'Archidekt',
  )(`https://archidekt.com/api/decks/${encodeURIComponent(id)}/`, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404)
    throw new DomainError('not_found', 'Deck não encontrado no Archidekt');
  if (!response.ok) {
    throw new DomainError('upstream_error', `Archidekt respondeu ${response.status}`);
  }
  return mapArchidektDeck(await response.json());
}
