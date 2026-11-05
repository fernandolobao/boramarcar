import 'server-only';
import {
  attachCardData,
  fetchScryfallCollection,
  isDomainError,
  resolveDeckImport,
  type DeckImportInput,
  type FetchLike,
} from '@boramarcar/core';
import { findCachedCards, saveImportedDeck, type Database } from '@boramarcar/db';
import { getEnv } from '@/env';

/**
 * Importa um deck: resolve a origem (URL ou texto), reaproveita cartas do cache local
 * e busca no Scryfall apenas as que faltam.
 */
export async function importDeck(
  db: Database,
  ownerId: string,
  input: DeckImportInput,
  fetchFn: FetchLike = fetch,
) {
  const deck = await resolveDeckImport(input, {
    fetch: fetchFn,
    moxfieldUserAgent: getEnv().MOXFIELD_USER_AGENT,
  }).catch((error: unknown) => {
    // Registra a falha da origem externa para diagnóstico nos logs da Vercel.
    if (isDomainError(error) && error.code === 'upstream_error') {
      console.warn('[import-deck] origem externa falhou', error.message, error.details);
    }
    throw error;
  });
  const cached = await findCachedCards(db, deck.entries);
  const missing = attachCardData(deck.entries, cached).filter((entry) => !entry.card);
  const { cards, notFound } = missing.length
    ? await fetchScryfallCollection(missing, { fetch: fetchFn })
    : { cards: [], notFound: [] };
  const saved = await saveImportedDeck(db, { ownerId, deck, cards });
  return { deck: saved, notFound };
}
