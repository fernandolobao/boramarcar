import 'server-only';
import {
  buildReplacementQuery,
  DomainError,
  isDomainError,
  deckFormatProfile,
  deckListHash,
  fetchCardRoles,
  fetchScryfallCollection,
  fetchScryfallSearch,
  fetchSpellbookSignals,
  spellbookDeck,
  type CardRole,
  type FetchLike,
} from '@boramarcar/core';
import {
  deckCardsForEnrichment,
  getDeck,
  saveBracketSignals,
  saveCardRoles,
  upsertCards,
  type Database,
} from '@boramarcar/db';

/** Decks sendo atualizados nesta instância (evita consultas repetidas em paralelo). */
const running = new Set<string>();

export interface RefreshResult {
  mana: number;
  roles: number;
  bracket: boolean;
  errors: string[];
}

/**
 * Completa a análise do deck com dados externos (4.5–4.8): mana produzida das cartas de cache
 * antigo, funções do Scryfall Tagger e combos/sinais de bracket do Commander Spellbook. Cada
 * etapa falha sozinha (o resto continua) e o erro vai para o log.
 */
export async function refreshDeckAnalysis(
  db: Database,
  input: { deckId: string; viewerId: string },
  fetchFn: FetchLike = fetch,
): Promise<RefreshResult> {
  const result: RefreshResult = { mana: 0, roles: 0, bracket: false, errors: [] };
  if (running.has(input.deckId)) return result;
  running.add(input.deckId);
  try {
    const deck = await getDeck(db, input);
    const pending = await deckCardsForEnrichment(db, deck.id);
    const step = async (name: string, task: () => Promise<void>) => {
      try {
        await task();
      } catch (error) {
        console.warn(`[deck-analysis] ${name} falhou`, error);
        result.errors.push(name);
      }
    };

    if (pending.missingMana.length) {
      await step('scryfall', async () => {
        const { cards } = await fetchScryfallCollection(
          pending.missingMana.map((id) => ({ name: id, scryfallId: id })),
          { fetch: fetchFn },
        );
        await upsertCards(db, cards);
        result.mana = cards.length;
      });
    }

    if (pending.staleRoles.length) {
      await step('tagger', async () => {
        const roles = await fetchCardRoles(
          pending.staleRoles.map((c) => c.name),
          { fetch: fetchFn },
        );
        await saveCardRoles(
          db,
          pending.staleRoles.map((c) => ({
            scryfallId: c.scryfallId,
            roles: roles.get(c.name.toLowerCase()) ?? [],
          })),
        );
        result.roles = pending.staleRoles.length;
      });
    }

    if (deck.bracket?.source === 'local') {
      await step('spellbook', async () => {
        const list = spellbookDeck(deck.entries);
        const signals = await fetchSpellbookSignals(list, fetchFn);
        await saveBracketSignals(db, { deckId: deck.id, hash: deckListHash(list), signals });
        result.bracket = true;
      });
    }
    return result;
  } finally {
    running.delete(input.deckId);
  }
}

/**
 * Alternativas para uma função (4.6): cartas com a tag do Tagger, na identidade de cor e no
 * formato do deck, ordenadas por popularidade no EDHREC, sem as que já estão no deck.
 */
export async function findAlternatives(
  db: Database,
  input: { deckId: string; viewerId: string; role: CardRole; maxCmc: number },
  fetchFn: FetchLike = fetch,
) {
  const deck = await getDeck(db, { deckId: input.deckId, viewerId: input.viewerId });
  const profile = deckFormatProfile(deck.format);
  const query = buildReplacementQuery(
    input.role,
    deck.analysis.colorIdentity,
    input.maxCmc,
    profile.scryfallFormat,
  );
  const inDeck = new Set(deck.entries.map((e) => e.name.toLowerCase()));
  const found = await fetchScryfallSearch(query, { fetch: fetchFn }).catch((error: unknown) => {
    // Falha de rede vira "serviço externo" (502), não erro interno.
    if (isDomainError(error)) throw error;
    console.warn('[alternatives] Scryfall indisponível', error);
    throw new DomainError('upstream_error', 'Scryfall indisponível');
  });
  const cards = found.filter((c) => !inDeck.has(c.name.toLowerCase())).slice(0, 12);
  await upsertCards(db, cards);
  return {
    query,
    cards: cards.map((c) => ({
      name: c.name,
      manaCost: c.manaCost,
      typeLine: c.typeLine,
      imageUri: c.imageUri,
      priceUsd: c.priceUsd,
      gameChanger: c.gameChanger ?? false,
    })),
  };
}
