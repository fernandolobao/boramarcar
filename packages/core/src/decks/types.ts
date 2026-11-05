export const DECK_BOARDS = ['commander', 'mainboard', 'sideboard', 'maybeboard'] as const;
export type DeckBoard = (typeof DECK_BOARDS)[number];

export const DECK_SOURCES = ['manual', 'text', 'archidekt', 'moxfield', 'scryfall'] as const;
export type DeckSource = (typeof DECK_SOURCES)[number];

/** Uma linha de deck como veio da origem (antes de buscar os dados da carta). */
export interface DeckEntry {
  name: string;
  quantity: number;
  board: DeckBoard;
  scryfallId?: string;
  setCode?: string;
  collectorNumber?: string;
  isFoil?: boolean;
  isProxy?: boolean;
}

export interface ImportedDeck {
  name: string;
  source: DeckSource;
  sourceId?: string;
  sourceUrl?: string;
  entries: DeckEntry[];
}

/** Dados de uma carta (subconjunto do objeto Card do Scryfall). */
export interface CardData {
  scryfallId: string;
  oracleId?: string | null;
  name: string;
  manaCost?: string | null;
  cmc: number;
  typeLine: string;
  oracleText?: string | null;
  colors: string[];
  colorIdentity: string[];
  imageUri?: string | null;
  priceUsd?: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
