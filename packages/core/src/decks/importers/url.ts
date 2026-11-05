import type { DeckSource } from '../types';

export interface DeckUrlInfo {
  source: Extract<DeckSource, 'archidekt' | 'moxfield'>;
  id: string;
  url: string;
}

/** Identifica a origem e o id de um deck a partir da URL pública. */
export function parseDeckUrl(raw: string): DeckUrlInfo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'archidekt.com') {
    const id = /^\/(?:api\/)?decks\/(\d+)/.exec(url.pathname)?.[1];
    return id ? { source: 'archidekt', id, url: `https://archidekt.com/decks/${id}` } : null;
  }
  if (host === 'moxfield.com') {
    const id = /^\/decks\/([\w-]+)/.exec(url.pathname)?.[1];
    return id ? { source: 'moxfield', id, url: `https://moxfield.com/decks/${id}` } : null;
  }
  return null;
}
