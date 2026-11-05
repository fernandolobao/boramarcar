import { DomainError } from '../errors';
import { fetchArchidektDeck } from './importers/archidekt';
import { fetchMoxfieldDeck } from './importers/moxfield';
import { parseDeckText, parseDeckTextName } from './importers/text';
import { parseDeckUrl } from './importers/url';
import type { FetchLike, ImportedDeck } from './types';

export type DeckImportInput =
  { kind: 'url'; url: string; name?: string } | { kind: 'text'; text: string; name?: string };

/** Resolve um pedido de importação (URL do Archidekt/Moxfield ou lista em texto). */
export async function resolveDeckImport(
  input: DeckImportInput,
  deps: { fetch: FetchLike; moxfieldUserAgent?: string },
): Promise<ImportedDeck> {
  if (input.kind === 'text') {
    const entries = parseDeckText(input.text);
    if (entries.length === 0) {
      throw new DomainError('invalid_input', 'Nenhuma carta reconhecida na lista');
    }
    const name = input.name?.trim() || parseDeckTextName(input.text) || 'Deck importado';
    return { name, source: 'text', entries };
  }

  const info = parseDeckUrl(input.url);
  if (!info) {
    throw new DomainError(
      'invalid_input',
      'URL não suportada. Use um link do Archidekt ou Moxfield.',
    );
  }
  const deck =
    info.source === 'archidekt'
      ? await fetchArchidektDeck(info.id, deps.fetch)
      : await fetchMoxfieldDeck(info.id, deps.fetch, deps.moxfieldUserAgent);
  return input.name ? { ...deck, name: input.name } : deck;
}
