import { z } from 'zod';
import { DomainError } from '../errors';
import type { CardData, DeckEntry, FetchLike } from './types';

export const SCRYFALL_API = 'https://api.scryfall.com';
/** Limite de identificadores por requisição em /cards/collection. */
export const SCRYFALL_COLLECTION_LIMIT = 75;

const faceSchema = z.object({
  mana_cost: z.string().optional(),
  type_line: z.string().optional(),
  oracle_text: z.string().optional(),
  image_uris: z.object({ normal: z.string() }).partial().optional(),
});

const scryfallCardSchema = z.object({
  id: z.string(),
  oracle_id: z.string().optional(),
  name: z.string(),
  mana_cost: z.string().optional(),
  cmc: z.number().default(0),
  type_line: z.string().default(''),
  oracle_text: z.string().optional(),
  colors: z.array(z.string()).optional(),
  color_identity: z.array(z.string()).default([]),
  image_uris: z.object({ normal: z.string() }).partial().optional(),
  card_faces: z.array(faceSchema).optional(),
  prices: z.object({ usd: z.string().nullable().optional() }).optional(),
});

const collectionSchema = z.object({
  data: z.array(scryfallCardSchema),
  not_found: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type ScryfallCard = z.input<typeof scryfallCardSchema>;

export function mapScryfallCard(raw: unknown): CardData {
  const card = scryfallCardSchema.parse(raw);
  const front = card.card_faces?.[0];
  const oracleText =
    card.oracle_text ??
    card.card_faces
      ?.map((f) => f.oracle_text)
      .filter(Boolean)
      .join('\n//\n') ??
    null;
  return {
    scryfallId: card.id,
    oracleId: card.oracle_id ?? null,
    name: card.name,
    manaCost: card.mana_cost ?? front?.mana_cost ?? null,
    cmc: card.cmc,
    typeLine: card.type_line || front?.type_line || '',
    oracleText: oracleText || null,
    colors: card.colors ?? [],
    colorIdentity: card.color_identity,
    imageUri: card.image_uris?.normal ?? front?.image_uris?.normal ?? null,
    priceUsd: card.prices?.usd ?? null,
  };
}

export interface ScryfallClientOptions {
  fetch: FetchLike;
  userAgent?: string;
  /** Pausa entre requisições (a Scryfall pede 50–100 ms). */
  delayMs?: number;
}

export interface CollectionResult {
  cards: CardData[];
  notFound: string[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca os dados das cartas na Scryfall usando `/cards/collection` em lotes de 75.
 * Usa o id Scryfall quando disponível; caso contrário, o nome.
 */
export async function fetchScryfallCollection(
  entries: readonly Pick<DeckEntry, 'name' | 'scryfallId'>[],
  { fetch: fetchFn, userAgent = 'BoraMarcar/0.1', delayMs = 100 }: ScryfallClientOptions,
): Promise<CollectionResult> {
  const unique = new Map<string, { id?: string; name?: string }>();
  for (const entry of entries) {
    const key = entry.scryfallId ? `id:${entry.scryfallId}` : `name:${entry.name.toLowerCase()}`;
    if (!unique.has(key)) {
      unique.set(key, entry.scryfallId ? { id: entry.scryfallId } : { name: entry.name });
    }
  }
  const identifiers = [...unique.values()];
  const cards: CardData[] = [];
  const notFound: string[] = [];

  for (let i = 0; i < identifiers.length; i += SCRYFALL_COLLECTION_LIMIT) {
    if (i > 0 && delayMs > 0) await sleep(delayMs);
    const batch = identifiers.slice(i, i + SCRYFALL_COLLECTION_LIMIT);
    const response = await fetchFn(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({ identifiers: batch }),
    });
    if (!response.ok) {
      throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
    }
    const parsed = collectionSchema.parse(await response.json());
    cards.push(...parsed.data.map(mapScryfallCard));
    for (const missing of parsed.not_found) {
      notFound.push(String(missing.name ?? missing.id ?? 'desconhecida'));
    }
  }
  return { cards, notFound };
}

/** Associa cada entrada do deck aos dados da carta (por id e, em seguida, por nome). */
export function attachCardData<T extends Pick<DeckEntry, 'name' | 'scryfallId'>>(
  entries: readonly T[],
  cards: readonly CardData[],
): (T & { card: CardData | null })[] {
  const byId = new Map(cards.map((c) => [c.scryfallId, c]));
  const byName = new Map<string, CardData>();
  for (const card of cards) {
    byName.set(card.name.toLowerCase(), card);
    // Cartas dupla face: "Frente // Verso" também casa com "Frente".
    const front = card.name.split(' // ')[0];
    if (front) byName.set(front.toLowerCase(), card);
  }
  return entries.map((entry) => ({
    ...entry,
    card:
      (entry.scryfallId ? byId.get(entry.scryfallId) : undefined) ??
      byName.get(entry.name.toLowerCase()) ??
      null,
  }));
}

const autocompleteSchema = z.object({ data: z.array(z.string()) });

/** Sugestões de nomes de carta (`/cards/autocomplete`, até 20). Menos de 2 letras: nada. */
export async function fetchScryfallAutocomplete(
  query: string,
  {
    fetch: fetchFn,
    userAgent = 'BoraMarcar/0.1',
  }: Pick<ScryfallClientOptions, 'fetch' | 'userAgent'>,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const response = await fetchFn(`${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(q)}`, {
    headers: { Accept: 'application/json', 'User-Agent': userAgent },
  });
  if (!response.ok) {
    throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
  }
  return autocompleteSchema.parse(await response.json()).data;
}
