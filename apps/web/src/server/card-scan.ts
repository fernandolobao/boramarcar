import 'server-only';
import {
  fetchScryfallBySetNumber,
  fetchScryfallFuzzy,
  fetchScryfallPrintedNames,
  nameSimilarity,
  readCardText,
  type CardData,
  type FetchLike,
  type ScanLine,
} from '@boramarcar/core';
import { upsertCards, type Database } from '@boramarcar/db';
import { resolveCardByName } from './deck-import';

export interface ScanMatch {
  card: CardData;
  /** Nome impresso quando a carta é de outra língua (ex.: "Infantaria dos Mil Luas"). */
  printedName: string | null;
  /** Como foi achada: edição + número (conferido com o nome), nome aproximado, nome em português ou edição + número sem conferir. */
  how: 'set' | 'name' | 'printed' | 'set-unverified';
}

/** Semelhança mínima entre o nome lido e o da carta achada (o "Giant" não vale por "Doomwake Gian"). */
const SIMILAR = 0.6;

/**
 * Acha a carta a partir do texto lido pela câmera (12.x, leitura de cartas). Ordem: edição +
 * número conferidos com o nome lido; nome aproximado; nome impresso em português; e, por último,
 * edição + número no formato da linha de colecionador sem conferir o nome. Falha do Scryfall numa
 * etapa não derruba as outras. A carta achada entra no cache.
 */
export async function lookupScannedCard(
  db: Database,
  input: { text: string; lines: readonly ScanLine[]; nameZone: number },
  fetchFn: FetchLike = fetch,
): Promise<{ match: ScanMatch | null; names: string[] }> {
  const reading = readCardText(input);
  const opts = { fetch: fetchFn };
  const safe = async <T>(run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run();
    } catch {
      return null;
    }
  };
  let match: ScanMatch | null = null;
  let unverified: ScanMatch | null = null;

  if (reading.set && reading.number) {
    const found = await safe(() =>
      fetchScryfallBySetNumber(
        { set: reading.set!, number: reading.number!, lang: reading.lang },
        opts,
      ),
    );
    if (found) {
      const agrees =
        reading.names.length === 0 ||
        reading.names.some(
          (n) =>
            nameSimilarity(n, found.card.name) >= SIMILAR ||
            (found.printedName !== null && nameSimilarity(n, found.printedName) >= SIMILAR),
        );
      const result = { card: found.card, printedName: found.printedName };
      if (agrees) match = { ...result, how: 'set' };
      else if (reading.strongNumber) unverified = { ...result, how: 'set-unverified' };
    }
  }

  for (const candidate of reading.candidates.slice(0, 4)) {
    if (match) break;
    const card = await safe(() => fetchScryfallFuzzy(candidate, opts));
    if (card && nameSimilarity(candidate, card.name) >= SIMILAR) {
      match = { card, printedName: null, how: 'name' };
    }
  }

  // Cartas em português: pelo nome impresso (o nome aproximado só conhece o inglês).
  for (const candidate of reading.candidates.slice(0, 4)) {
    if (match) break;
    const printed = await safe(() => fetchScryfallPrintedNames(candidate, { ...opts, limit: 5 }));
    const hit = printed?.find((p) => nameSimilarity(candidate, p.printedName) >= 0.7);
    if (hit) {
      const card = await safe(() => resolveCardByName(db, hit.name, fetchFn));
      if (card) match = { card, printedName: hit.printedName, how: 'printed' };
    }
  }

  match ??= unverified;
  if (match) await upsertCards(db, [match.card]).catch(() => undefined);
  return { match, names: reading.names };
}
