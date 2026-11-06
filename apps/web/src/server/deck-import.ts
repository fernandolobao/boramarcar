import 'server-only';
import {
  attachCardData,
  DomainError,
  fetchScryfallCollection,
  parseDeckText,
  isDomainError,
  resolveDeckImport,
  type DeckImportInput,
  type FetchLike,
} from '@boramarcar/core';
import {
  findCachedCardByName,
  findCachedCards,
  getDeck,
  saveImportedDeck,
  syncDeckCards,
  type Database,
} from '@boramarcar/db';
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

/** Dados de uma carta pelo nome: cache local primeiro, depois o Scryfall. `null` se não existir. */
export async function resolveCardByName(db: Database, name: string, fetchFn: FetchLike = fetch) {
  const cached = await findCachedCardByName(db, name);
  if (cached) return cached;
  const { cards } = await fetchScryfallCollection([{ name }], { fetch: fetchFn });
  return cards[0] ?? null;
}

/**
 * Sincroniza o deck (3.8) com a origem (Archidekt/Moxfield) ou com uma lista colada —
 * útil quando o Moxfield bloqueia a leitura automática. Mantém as marcações de proxy.
 */
export async function syncDeck(
  db: Database,
  input: { userId: string; deckId: string; text?: string },
  fetchFn: FetchLike = fetch,
) {
  const deck = await getDeck(db, { deckId: input.deckId, viewerId: input.userId });
  if (!deck.isOwner) throw new DomainError('forbidden', 'Apenas o dono edita o deck');
  let entries;
  if (input.text) {
    entries = parseDeckText(input.text);
    if (!entries.length)
      throw new DomainError('invalid_input', 'Nenhuma carta reconhecida na lista');
  } else {
    if (!deck.sourceUrl) {
      throw new DomainError(
        'invalid_input',
        'Este deck não tem link de origem: cole a lista atualizada',
      );
    }
    entries = (
      await resolveDeckImport(
        { kind: 'url', url: deck.sourceUrl },
        { fetch: fetchFn, moxfieldUserAgent: getEnv().MOXFIELD_USER_AGENT },
      )
    ).entries;
  }
  const cached = await findCachedCards(db, entries);
  const missing = attachCardData(entries, cached).filter((entry) => !entry.card);
  const { cards, notFound } = missing.length
    ? await fetchScryfallCollection(missing, { fetch: fetchFn })
    : { cards: [], notFound: [] };
  const result = await syncDeckCards(db, { deckId: deck.id, userId: input.userId, entries, cards });
  return { ...result, notFound };
}
