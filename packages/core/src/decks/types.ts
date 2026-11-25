import type { GameFormat } from '../games';
export const DECK_BOARDS = ['commander', 'mainboard', 'sideboard', 'maybeboard', 'tokens'] as const;
export type DeckBoard = (typeof DECK_BOARDS)[number];

/** Token ou emblema, pela linha de tipo do Scryfall ("Token Creature — Soldier", "Emblem — Liliana"). */
export const isTokenTypeLine = (typeLine: string | null | undefined) =>
  /^(token|emblem)\b/i.test((typeLine ?? '').trim());

/**
 * Categoria em que a linha aparece: token e emblema vão para "tokens", mesmo que tenham sido
 * guardados antes em "talvez" (decks importados antes da categoria existir).
 */
export const boardOf = (board: DeckBoard, typeLine: string | null | undefined): DeckBoard =>
  isTokenTypeLine(typeLine) ? 'tokens' : board;

/** "Talvez" e tokens não são cartas do deck: ficam fora do total, do preço, da coleção e da impressão. */
export const outsideDeck = (board: DeckBoard | string) =>
  board === 'maybeboard' || board === 'tokens';

/** Quem vê o deck: só o dono, quem divide grupo com ele, ou qualquer pessoa com conta. */
export const DECK_VISIBILITIES = ['private', 'group', 'public'] as const;
export type DeckVisibility = (typeof DECK_VISIBILITIES)[number];

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
  /** Formato informado pela origem (Archidekt/Moxfield), quando reconhecido. */
  format?: GameFormat;
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
  /** Cores de mana que a carta produz (`produced_mana` do Scryfall). `null` = ainda não lido. */
  producedMana?: string[] | null;
  /** Está na lista oficial de Game Changers do Commander. */
  gameChanger?: boolean;
  /** Popularidade no EDHREC (menor = mais jogada). */
  edhrecRank?: number | null;
  /** Funções pelo Scryfall Tagger (ramp, draw…). `null` = ainda não consultado. */
  roles?: string[] | null;
  /** Edição desta impressão (ex.: `cmm`, "Commander Masters", `400`). */
  setCode?: string | null;
  setName?: string | null;
  collectorNumber?: string | null;
  /** Verso de cartas de duas faces (transformar, MDFC…); `null` = carta de uma face só. */
  backImageUri?: string | null;
  backName?: string | null;
  /** Legalidade por formato do Scryfall (`legal`, `not_legal`, `banned`, `restricted`). */
  legalities?: Record<string, string> | null;
  /** Ilustrador(es) desta impressão. */
  artist?: string | null;
  /** Data de lançamento desta impressão (AAAA-MM-DD). */
  releasedAt?: string | null;
  /** `common` | `uncommon` | `rare` | `mythic` | `special` | `bonus`. */
  rarity?: string | null;
  /** Preço da versão foil (USD). */
  priceUsdFoil?: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
