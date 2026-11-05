import { z } from 'zod';
import { DomainError } from '../../errors';
import type { DeckBoard, DeckEntry, FetchLike, ImportedDeck } from '../types';
import { mergeDuplicates } from './text';

const boardSchema = z
  .object({
    cards: z
      .record(
        z.string(),
        z.object({
          quantity: z.number().int().positive(),
          isFoil: z.boolean().optional(),
          finish: z.string().optional(),
          card: z.object({
            name: z.string(),
            scryfall_id: z.string().optional(),
            set: z.string().optional(),
            cn: z.string().optional(),
          }),
        }),
      )
      .default({}),
  })
  .optional();

const moxfieldDeckSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  boards: z.object({
    commanders: boardSchema,
    mainboard: boardSchema,
    sideboard: boardSchema,
    maybeboard: boardSchema,
  }),
});

const BOARD_MAP: Record<string, DeckBoard> = {
  commanders: 'commander',
  mainboard: 'mainboard',
  sideboard: 'sideboard',
  maybeboard: 'maybeboard',
};

/**
 * Converte a resposta de `GET https://api2.moxfield.com/v3/decks/all/{publicId}`.
 *
 * Atenção: a API do Moxfield não é pública/documentada e pode exigir autorização
 * (User-Agent aprovado). Por isso a importação por texto é sempre oferecida como alternativa.
 */
export function mapMoxfieldDeck(payload: unknown): ImportedDeck {
  const parsed = moxfieldDeckSchema.safeParse(payload);
  if (!parsed.success) {
    throw new DomainError('upstream_error', 'Resposta inesperada do Moxfield', parsed.error.issues);
  }
  const deck = parsed.data;
  const entries: DeckEntry[] = [];
  for (const [boardName, board] of Object.entries(deck.boards)) {
    const target = BOARD_MAP[boardName];
    if (!target || !board) continue;
    for (const item of Object.values(board.cards)) {
      const entry: DeckEntry = { name: item.card.name, quantity: item.quantity, board: target };
      if (item.card.scryfall_id) entry.scryfallId = item.card.scryfall_id;
      if (item.card.set) entry.setCode = item.card.set;
      if (item.card.cn) entry.collectorNumber = item.card.cn;
      if (item.isFoil || (item.finish && item.finish !== 'nonFoil')) entry.isFoil = true;
      entries.push(entry);
    }
  }
  return {
    name: deck.name,
    source: 'moxfield',
    sourceId: deck.publicId,
    sourceUrl: `https://moxfield.com/decks/${deck.publicId}`,
    entries: mergeDuplicates(entries),
  };
}

export async function fetchMoxfieldDeck(
  publicId: string,
  fetchFn: FetchLike,
  userAgent = 'BoraMarcar/0.1',
): Promise<ImportedDeck> {
  const response = await fetchFn(
    `https://api2.moxfield.com/v3/decks/all/${encodeURIComponent(publicId)}`,
    { headers: { Accept: 'application/json', 'User-Agent': userAgent } },
  );
  if (response.status === 404)
    throw new DomainError('not_found', 'Deck não encontrado no Moxfield');
  if (!response.ok) {
    throw new DomainError(
      'upstream_error',
      `Moxfield respondeu ${response.status}. Tente importar colando a lista em texto.`,
    );
  }
  return mapMoxfieldDeck(await response.json());
}
