import 'server-only';
import {
  fetchScryfallCollection,
  SCRYFALL_COLLECTION_LIMIT,
  type FetchLike,
} from '@boramarcar/core';
import { staleDeckCards, touchCards, upsertCards, type Database } from '@boramarcar/db';

export interface RefreshCacheResult {
  checked: number;
  updated: number;
  missing: number;
}

/**
 * Atualiza o cache de cartas (3.13): preços, Game Changers, imagens e edições mudam no Scryfall.
 * Em vez do bulk data (centenas de MB, grande demais para uma função serverless), relê pelo
 * `/cards/collection` só as cartas que estão em algum deck e não foram atualizadas há `maxAgeHours`,
 * das mais antigas para as mais novas, até `limit` cartas por execução (lotes de 75, 100 ms entre eles).
 */
export async function refreshScryfallCache(
  db: Database,
  options: { fetch?: FetchLike; limit?: number; maxAgeHours?: number; now?: Date } = {},
): Promise<RefreshCacheResult> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 20 * SCRYFALL_COLLECTION_LIMIT;
  const cutoff = new Date(now.getTime() - (options.maxAgeHours ?? 20) * 3600_000);
  const stale = await staleDeckCards(db, { olderThan: cutoff, limit });
  if (!stale.length) return { checked: 0, updated: 0, missing: 0 };
  const { cards } = await fetchScryfallCollection(
    stale.map((c) => ({ name: c.name, scryfallId: c.scryfallId })),
    { fetch: options.fetch ?? fetch },
  );
  await upsertCards(db, cards);
  // Cartas que sumiram do Scryfall: marca como vistas para não tentar de novo todo dia.
  const found = new Set(cards.map((c) => c.scryfallId));
  const missing = stale.filter((c) => !found.has(c.scryfallId)).map((c) => c.scryfallId);
  await touchCards(db, missing);
  return { checked: stale.length, updated: cards.length, missing: missing.length };
}
