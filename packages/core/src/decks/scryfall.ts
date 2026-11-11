import { z } from 'zod';
import { DomainError } from '../errors';
import type { CardData, DeckEntry, FetchLike } from './types';

export const SCRYFALL_API = 'https://api.scryfall.com';
/** Limite de identificadores por requisição em /cards/collection. */
export const SCRYFALL_COLLECTION_LIMIT = 75;

const faceSchema = z.object({
  name: z.string().optional(),
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
  prices: z
    .object({
      usd: z.string().nullable().optional(),
      usd_foil: z.string().nullable().optional(),
    })
    .optional(),
  artist: z.string().optional(),
  released_at: z.string().optional(),
  rarity: z.string().optional(),
  produced_mana: z.array(z.string()).optional(),
  game_changer: z.boolean().optional(),
  edhrec_rank: z.number().nullable().optional(),
  set: z.string().optional(),
  set_name: z.string().optional(),
  collector_number: z.string().optional(),
  legalities: z.record(z.string(), z.string()).optional(),
});

const collectionSchema = z.object({
  data: z.array(scryfallCardSchema),
  not_found: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type ScryfallCard = z.input<typeof scryfallCardSchema>;

function twoSided(card: z.infer<typeof scryfallCardSchema>) {
  const back = card.card_faces?.[1];
  const backImage = !card.image_uris?.normal ? back?.image_uris?.normal : undefined;
  return backImage
    ? { backImageUri: backImage, backName: back?.name ?? null }
    : { backImageUri: null, backName: null };
}

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
    producedMana: card.produced_mana ?? [],
    gameChanger: card.game_changer ?? false,
    edhrecRank: card.edhrec_rank ?? null,
    setCode: card.set ?? null,
    setName: card.set_name ?? null,
    collectorNumber: card.collector_number ?? null,
    // Duas faces de verdade (cada uma com imagem própria): transformar, MDFC, meld etc.
    // Cartas divididas/aventura têm `card_faces`, mas uma imagem só (`image_uris` no topo).
    ...twoSided(card),
    legalities: card.legalities ?? null,
    artist: card.artist ?? null,
    releasedAt: card.released_at ?? null,
    rarity: card.rarity ?? null,
    priceUsdFoil: card.prices?.usd_foil ?? null,
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
  entries: readonly Pick<DeckEntry, 'name' | 'scryfallId' | 'setCode' | 'collectorNumber'>[],
  { fetch: fetchFn, userAgent = 'ArcanaKin/0.1', delayMs = 100 }: ScryfallClientOptions,
): Promise<CollectionResult> {
  type Identifier = { id?: string; name?: string; set?: string; collector_number?: string };
  const unique = new Map<string, { identifier: Identifier; name: string }>();
  for (const entry of entries) {
    const [key, identifier]: [string, Identifier] = entry.scryfallId
      ? [`id:${entry.scryfallId}`, { id: entry.scryfallId }]
      : entry.setCode && entry.collectorNumber
        ? [
            `print:${entry.setCode.toLowerCase()}:${entry.collectorNumber}`,
            { set: entry.setCode.toLowerCase(), collector_number: entry.collectorNumber },
          ]
        : [`name:${entry.name.toLowerCase()}`, { name: entry.name }];
    if (!unique.has(key)) unique.set(key, { identifier, name: entry.name });
  }
  const cards: CardData[] = [];
  const notFound: string[] = [];
  const retryByName: { name: string }[] = [];

  const run = async (identifiers: Identifier[], names: string[], allowRetry: boolean) => {
    for (let i = 0; i < identifiers.length; i += SCRYFALL_COLLECTION_LIMIT) {
      if ((i > 0 || !allowRetry) && delayMs > 0) await sleep(delayMs);
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
        const set = typeof missing.set === 'string' ? missing.set : null;
        const number =
          typeof missing.collector_number === 'string' ? missing.collector_number : null;
        // Edição/número desconhecidos: tenta de novo pelo nome (uma impressão qualquer).
        const index =
          set && number
            ? identifiers.findIndex((x) => x.set === set && x.collector_number === number)
            : -1;
        if (allowRetry && index >= 0) retryByName.push({ name: names[index]! });
        else notFound.push(String(missing.name ?? missing.id ?? 'desconhecida'));
      }
    }
  };
  const all = [...unique.values()];
  await run(
    all.map((u) => u.identifier),
    all.map((u) => u.name),
    true,
  );
  if (retryByName.length) {
    await run(
      retryByName,
      retryByName.map((r) => r.name),
      false,
    );
  }
  return { cards, notFound };
}

/**
 * A carta associada é a impressão pedida? (Sem id nem edição na entrada, qualquer uma serve.)
 * Usado para decidir o que buscar no Scryfall mesmo havendo a carta no cache.
 */
export function isRequestedPrint(
  entry: Pick<DeckEntry, 'scryfallId' | 'setCode' | 'collectorNumber'>,
  card: CardData | null,
): boolean {
  if (!card) return false;
  if (entry.scryfallId) return card.scryfallId === entry.scryfallId;
  if (entry.setCode && entry.collectorNumber) {
    return (
      card.setCode?.toLowerCase() === entry.setCode.toLowerCase() &&
      card.collectorNumber === entry.collectorNumber
    );
  }
  return true;
}

const printKey = (set: string, number: string) => `${set.toLowerCase()}:${number}`;

/** Associa cada entrada do deck aos dados da carta (por id, edição + número e, por fim, nome). */
export function attachCardData<
  T extends Pick<DeckEntry, 'name' | 'scryfallId'> &
    Partial<Pick<DeckEntry, 'setCode' | 'collectorNumber'>>,
>(entries: readonly T[], cards: readonly CardData[]): (T & { card: CardData | null })[] {
  const byId = new Map(cards.map((c) => [c.scryfallId, c]));
  const byPrint = new Map(
    cards.flatMap((c) =>
      c.setCode && c.collectorNumber ? [[printKey(c.setCode, c.collectorNumber), c] as const] : [],
    ),
  );
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
      (entry.setCode && entry.collectorNumber
        ? byPrint.get(printKey(entry.setCode, entry.collectorNumber))
        : undefined) ??
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
    userAgent = 'ArcanaKin/0.1',
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

const searchSchema = z.object({ data: z.array(z.unknown()) });

/** Primeira página de uma busca do Scryfall (`/cards/search`); sem resultados = lista vazia. */
export async function fetchScryfallSearch(
  q: string,
  {
    fetch: fetchFn,
    userAgent = 'ArcanaKin/0.1',
    order = 'edhrec',
  }: Pick<ScryfallClientOptions, 'fetch' | 'userAgent'> & { order?: string },
): Promise<CardData[]> {
  const response = await fetchFn(
    `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(q)}&order=${order}&unique=cards`,
    { headers: { Accept: 'application/json', 'User-Agent': userAgent } },
  );
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
  }
  return searchSchema.parse(await response.json()).data.map(mapScryfallCard);
}

/** Uma impressão da carta, para escolher a edição no editor. */
export interface CardPrint {
  scryfallId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageUri: string | null;
  priceUsd: string | null;
}

/** Todas as impressões de uma carta (mais novas primeiro), sem variações. Até 175. */
export async function fetchScryfallPrints(
  name: string,
  {
    fetch: fetchFn,
    userAgent = 'ArcanaKin/0.1',
  }: Pick<ScryfallClientOptions, 'fetch' | 'userAgent'>,
): Promise<CardPrint[]> {
  const q = `!"${name.replace(/"/g, '')}" game:paper`;
  const response = await fetchFn(
    `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=released&dir=desc`,
    { headers: { Accept: 'application/json', 'User-Agent': userAgent } },
  );
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
  }
  return searchSchema
    .parse(await response.json())
    .data.map(mapScryfallCard)
    .map((c) => ({
      scryfallId: c.scryfallId,
      name: c.name,
      setCode: c.setCode ?? '',
      setName: c.setName ?? '',
      collectorNumber: c.collectorNumber ?? '',
      imageUri: c.imageUri ?? null,
      priceUsd: c.priceUsd ?? null,
    }));
}

/** Uma carta pelo id do Scryfall; `null` se não existir. */
export async function fetchScryfallCard(
  id: string,
  {
    fetch: fetchFn,
    userAgent = 'ArcanaKin/0.1',
  }: Pick<ScryfallClientOptions, 'fetch' | 'userAgent'>,
): Promise<CardData | null> {
  const response = await fetchFn(`${SCRYFALL_API}/cards/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json', 'User-Agent': userAgent },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
  }
  return mapScryfallCard(await response.json());
}
