/** Agrupamento e totais de cartas para exibir o deck (visual e lista). */

export const CARD_TYPE_GROUPS = [
  'creature',
  'planeswalker',
  'battle',
  'instant',
  'sorcery',
  'artifact',
  'enchantment',
  'land',
  'other',
] as const;
export type CardTypeGroup = (typeof CARD_TYPE_GROUPS)[number];

/**
 * Grupo de tipo da carta, na ordem usada por Moxfield/Archidekt: criatura vence os demais
 * (Artifact Creature é criatura), depois planeswalker, batalha, mágica instantânea, feitiço,
 * artefato, encantamento e terreno. Só a face da frente conta em cartas de duas faces.
 */
export function cardTypeGroup(typeLine: string | null | undefined): CardTypeGroup {
  const front = (typeLine ?? '').split('//')[0]!.split('—')[0]!;
  if (/\bCreature\b/.test(front)) return 'creature';
  if (/\bPlaneswalker\b/.test(front)) return 'planeswalker';
  if (/\bBattle\b/.test(front)) return 'battle';
  if (/\bInstant\b/.test(front)) return 'instant';
  if (/\bSorcery\b/.test(front)) return 'sorcery';
  if (/\bLand\b/.test(front)) return 'land';
  if (/\bArtifact\b/.test(front)) return 'artifact';
  if (/\bEnchantment\b/.test(front)) return 'enchantment';
  return 'other';
}

export interface PresentableEntry {
  quantity: number;
  isProxy: boolean;
  card: { typeLine: string; cmc: number; priceUsd?: string | null } | null;
}

/** Agrupa por tipo (ordem fixa, grupos vazios omitidos); dentro do grupo, por custo e nome. */
export function groupEntriesByType<T extends PresentableEntry & { name: string }>(
  entries: readonly T[],
) {
  const groups = new Map<CardTypeGroup, T[]>();
  for (const entry of entries) {
    const key = cardTypeGroup(entry.card?.typeLine);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return CARD_TYPE_GROUPS.filter((g) => groups.has(g)).map((group) => {
    const items = groups
      .get(group)!
      .sort((a, b) => (a.card?.cmc ?? 0) - (b.card?.cmc ?? 0) || a.name.localeCompare(b.name));
    return { group, entries: items, count: items.reduce((sum, e) => sum + e.quantity, 0) };
  });
}

/**
 * Preço estimado do deck em dólares (Scryfall), separando o que é proxy.
 * Cartas sem preço não entram e são contadas em `missing`.
 */
export function deckPrice(entries: readonly PresentableEntry[]) {
  let owned = 0;
  let proxies = 0;
  let missing = 0;
  for (const entry of entries) {
    const price = entry.card?.priceUsd ? Number(entry.card.priceUsd) : Number.NaN;
    if (Number.isNaN(price)) {
      missing += entry.quantity;
      continue;
    }
    if (entry.isProxy) proxies += price * entry.quantity;
    else owned += price * entry.quantity;
  }
  const round = (v: number) => Math.round(v * 100) / 100;
  return { owned: round(owned), proxies: round(proxies), total: round(owned + proxies), missing };
}
