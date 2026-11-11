import type { CardData } from '../decks/types';

/** O que os filtros e totais precisam de uma linha da coleção. */
export interface CollectionItem {
  name: string;
  quantity: number;
  foil: boolean;
  card: Pick<
    CardData,
    | 'colorIdentity'
    | 'cmc'
    | 'typeLine'
    | 'setCode'
    | 'setName'
    | 'releasedAt'
    | 'artist'
    | 'rarity'
    | 'priceUsd'
    | 'priceUsdFoil'
  > | null;
  /** Decks da pessoa com esta carta. */
  decks: readonly unknown[];
  addedAt?: Date | string;
}

export const COLLECTION_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export const COLLECTION_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Land',
  'Battle',
] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

export const COLLECTION_RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'special'] as const;

/** Custos de mana nos filtros: 0 a 6 e "7 ou mais". */
export const COLLECTION_CMCS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export const COLLECTION_SORTS = ['name', 'value', 'cmc', 'set', 'recent'] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export interface CollectionFilters {
  /** Parte do nome ou da linha de tipo. */
  text?: string;
  /** Identidade de cor. `C` = incolor. */
  colors?: readonly CollectionColor[];
  /** `any`: tem alguma das cores; `exact`: exatamente essas cores. */
  colorMode?: 'any' | 'exact';
  /** Valor de mana; 7 vale "7 ou mais". */
  cmcs?: readonly number[];
  types?: readonly CollectionType[];
  set?: string;
  year?: number;
  /** Parte do nome do ilustrador. */
  artist?: string;
  rarity?: string;
  foil?: 'all' | 'foil' | 'nonfoil';
  inDeck?: 'all' | 'yes' | 'no';
}

const num = (value: string | null | undefined) => {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Preço de uma cópia em USD: foil usa o preço foil (ou o comum, se não houver). */
export function unitPriceUsd(item: Pick<CollectionItem, 'card' | 'foil'>): number | null {
  if (!item.card) return null;
  const regular = num(item.card.priceUsd);
  return item.foil ? (num(item.card.priceUsdFoil) ?? regular) : regular;
}

export function releaseYear(item: Pick<CollectionItem, 'card'>): number | null {
  const year = Number(item.card?.releasedAt?.slice(0, 4));
  return Number.isInteger(year) && year > 1990 ? year : null;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function filterCollection<T extends CollectionItem>(
  items: readonly T[],
  filters: CollectionFilters,
): T[] {
  const text = filters.text?.trim() ? fold(filters.text.trim()) : null;
  const artist = filters.artist?.trim() ? fold(filters.artist.trim()) : null;
  const colors = filters.colors?.length ? new Set(filters.colors) : null;
  const cmcs = filters.cmcs?.length ? new Set(filters.cmcs) : null;
  const types = filters.types?.length ? filters.types : null;

  return items.filter((item) => {
    const card = item.card;
    if (text && !fold(item.name).includes(text) && !fold(card?.typeLine ?? '').includes(text)) {
      return false;
    }
    if (colors) {
      const identity: CollectionColor[] = card?.colorIdentity.length
        ? (card.colorIdentity as CollectionColor[])
        : ['C'];
      if (!card) return false;
      if (filters.colorMode === 'exact') {
        if (identity.length !== colors.size || identity.some((c) => !colors.has(c))) return false;
      } else if (!identity.some((c) => colors.has(c))) {
        return false;
      }
    }
    if (cmcs) {
      if (!card) return false;
      if (!cmcs.has(Math.min(Math.floor(card.cmc), 7))) return false;
    }
    if (types && !types.some((t) => card?.typeLine.includes(t))) return false;
    if (filters.set && card?.setCode?.toLowerCase() !== filters.set.toLowerCase()) return false;
    if (filters.year && releaseYear(item) !== filters.year) return false;
    if (artist && !fold(card?.artist ?? '').includes(artist)) return false;
    if (filters.rarity && card?.rarity !== filters.rarity) return false;
    if (filters.foil === 'foil' && !item.foil) return false;
    if (filters.foil === 'nonfoil' && item.foil) return false;
    if (filters.inDeck === 'yes' && !item.decks.length) return false;
    if (filters.inDeck === 'no' && item.decks.length) return false;
    return true;
  });
}

export function sortCollection<T extends CollectionItem>(
  items: readonly T[],
  sort: CollectionSort,
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const value = (i: T) => (unitPriceUsd(i) ?? -1) * i.quantity;
  const time = (i: T) => (i.addedAt ? new Date(i.addedAt).getTime() : 0);
  const compare: Record<CollectionSort, (a: T, b: T) => number> = {
    name: byName,
    value: (a, b) => value(b) - value(a) || byName(a, b),
    cmc: (a, b) => (a.card?.cmc ?? 99) - (b.card?.cmc ?? 99) || byName(a, b),
    set: (a, b) =>
      (b.card?.releasedAt ?? '').localeCompare(a.card?.releasedAt ?? '') ||
      (a.card?.setName ?? '').localeCompare(b.card?.setName ?? '') ||
      byName(a, b),
    recent: (a, b) => time(b) - time(a) || byName(a, b),
  };
  return [...items].sort(compare[sort]);
}

export interface CollectionTotals {
  /** Cópias físicas. */
  copies: number;
  /** Cartas diferentes (pelo nome). */
  unique: number;
  valueUsd: number;
  /** Cópias sem preço conhecido (não entram no valor). */
  unpriced: number;
}

export function collectionTotals(items: readonly CollectionItem[]): CollectionTotals {
  let copies = 0;
  let valueUsd = 0;
  let unpriced = 0;
  const names = new Set<string>();
  for (const item of items) {
    copies += item.quantity;
    names.add(item.name.toLowerCase());
    const price = unitPriceUsd(item);
    if (price === null) unpriced += item.quantity;
    else valueUsd += price * item.quantity;
  }
  return { copies, unique: names.size, valueUsd: Math.round(valueUsd * 100) / 100, unpriced };
}

/** Opções dos filtros a partir do que existe na coleção (edições, anos, raridades). */
export function collectionFacets(items: readonly CollectionItem[]) {
  const sets = new Map<string, { code: string; name: string; releasedAt: string }>();
  const years = new Set<number>();
  const artists = new Set<string>();
  for (const item of items) {
    const card = item.card;
    if (!card) continue;
    if (card.setCode) {
      sets.set(card.setCode, {
        code: card.setCode,
        name: card.setName ?? card.setCode.toUpperCase(),
        releasedAt: card.releasedAt ?? '',
      });
    }
    const year = releaseYear(item);
    if (year) years.add(year);
    if (card.artist) artists.add(card.artist);
  }
  return {
    sets: [...sets.values()].sort((a, b) => a.name.localeCompare(b.name)),
    years: [...years].sort((a, b) => b - a),
    artists: [...artists].sort((a, b) => a.localeCompare(b)),
  };
}
