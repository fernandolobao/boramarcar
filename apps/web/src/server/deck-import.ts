import 'server-only';
import {
  attachCardData,
  DomainError,
  fetchScryfallCard,
  fetchScryfallCollection,
  fetchScryfallPrints,
  parseDeckText,
  isDomainError,
  isRequestedPrint,
  resolveDeckImport,
  type DeckBoard,
  type DeckImportInput,
  type FetchLike,
  type GameFormat,
  dedupePrints,
} from '@boramarcar/core';
import {
  cachedExternal,
  findCachedCardByName,
  findCachedCards,
  moveLinePrint,
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
  /** Formato escolhido; sem escolha, o detectado na origem ou Commander. */
  format?: GameFormat,
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
  const missing = attachCardData(deck.entries, cached).filter(
    (entry) => !isRequestedPrint(entry, entry.card),
  );
  const { cards, notFound } = missing.length
    ? await fetchScryfallCollection(missing, { fetch: fetchFn })
    : { cards: [], notFound: [] };
  const saved = await saveImportedDeck(db, {
    ownerId,
    deck,
    cards,
    format:
      format ??
      deck.format ??
      (deck.entries.some((e) => e.board === 'commander') ? 'commander' : 'other'),
  });
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
 * Carta pelo nome na impressão padrão do Scryfall (a que a busca por nome devolve), para
 * "Adicionar carta". O cache local guarda qualquer edição que já apareceu num deck, então só é
 * usado se o Scryfall não responder.
 */
export async function resolveDefaultCardByName(
  db: Database,
  name: string,
  fetchFn: FetchLike = fetch,
) {
  try {
    const { cards } = await fetchScryfallCollection([{ name }], { fetch: fetchFn });
    if (cards[0]) return cards[0];
    return null;
  } catch {
    return findCachedCardByName(db, name);
  }
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
  const missing = attachCardData(entries, cached).filter(
    (entry) => !isRequestedPrint(entry, entry.card),
  );
  const { cards, notFound } = missing.length
    ? await fetchScryfallCollection(missing, { fetch: fetchFn })
    : { cards: [], notFound: [] };
  const result = await syncDeckCards(db, { deckId: deck.id, userId: input.userId, entries, cards });
  return { ...result, notFound };
}

/** Falha de rede com o Scryfall vira erro de serviço externo (502), não erro interno. */
async function scryfall<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (isDomainError(error)) throw error;
    console.warn('[scryfall] indisponível', error);
    throw new DomainError('upstream_error', 'Scryfall indisponível');
  }
}

/** Uma impressão pelo id: cache local e, senão, o Scryfall. */
export async function resolveCardById(db: Database, id: string, fetchFn: FetchLike = fetch) {
  const cached = (await findCachedCards(db, [{ name: '', scryfallId: id }])).find(
    (c) => c.scryfallId === id,
  );
  if (cached) return cached;
  return scryfall(() => fetchScryfallCard(id, { fetch: fetchFn }));
}

/** Impressões de uma carta (escolha da edição no editor). */
/** Edições de uma carta (Scryfall), guardadas no cache compartilhado por 7 dias. */
/** Chave do cache das impressões; a versão muda quando o formato guardado muda (v2: ilustrador). */
export const printsCacheKey = (name: string) => `prints:v2:${name.trim().toLowerCase()}`;

export const listCardPrints = async (db: Database, name: string, fetchFn: FetchLike = fetch) =>
  // `dedupePrints` também na leitura: listas guardadas antes da correção saram sem esperar o cache vencer.
  dedupePrints(
    await cachedExternal(db, printsCacheKey(name), 7 * DAY, () =>
      scryfall(() => fetchScryfallPrints(name, { fetch: fetchFn })),
    ),
  );

const DAY = 24 * 60 * 60 * 1000;

/** Troca a edição de parte das cópias de uma linha do deck. */
export async function changeLinePrint(
  db: Database,
  input: {
    deckId: string;
    userId: string;
    board: DeckBoard;
    name: string;
    fromScryfallId: string | null;
    toScryfallId: string;
    quantity: number;
    foil?: boolean;
  },
  fetchFn: FetchLike = fetch,
) {
  const card = await resolveCardById(db, input.toScryfallId, fetchFn);
  if (!card) throw new DomainError('not_found', 'Edição não encontrada no Scryfall');
  return moveLinePrint(db, { ...input, card });
}
