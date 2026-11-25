import 'server-only';
import { fetchScryfallCollection } from '@boramarcar/core';
import { findCachedCardByName, upsertCards, type Database } from '@boramarcar/db';

/**
 * Imagens das cartas de exemplo da trilha (12.1): primeiro o cache local; as que faltam vêm do
 * Scryfall num pedido só e entram no cache. Sem rede, a lição mostra só o nome da carta.
 */
export async function exampleCardImages(
  db: Database,
  names: readonly string[],
): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  const missing: string[] = [];
  for (const name of new Set(names)) {
    const cached = await findCachedCardByName(db, name).catch(() => null);
    if (cached?.imageUri) images.set(name, cached.imageUri);
    else missing.push(name);
  }
  if (missing.length) {
    try {
      const { cards } = await fetchScryfallCollection(
        missing.map((name) => ({ name })),
        { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(4000) }) },
      );
      await upsertCards(db, cards);
      for (const card of cards) if (card.imageUri) images.set(card.name, card.imageUri);
    } catch (error) {
      console.error(
        '[aprender] Scryfall indisponível',
        error instanceof Error ? error.message : '',
      );
    }
  }
  return images;
}
