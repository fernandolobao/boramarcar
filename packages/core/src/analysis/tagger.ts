import { DomainError } from '../errors';
import { SCRYFALL_API } from '../decks/scryfall';
import type { FetchLike } from '../decks/types';

/**
 * Funções de carta pelo Scryfall Tagger (4.5). As quatro primeiras entram na nota do deck;
 * as demais são informativas. Tags conferidas na busca do Scryfall (otag:…).
 */
export const TAGGER_ROLES = [
  'ramp',
  'draw',
  'removal',
  'wipe',
  'tutor',
  'protection',
  'recursion',
  'counterspell',
] as const;
export type TaggerRole = (typeof TAGGER_ROLES)[number];

export const ROLE_OTAG: Record<TaggerRole, string> = {
  ramp: 'ramp',
  draw: 'card-advantage',
  removal: 'removal',
  wipe: 'sweeper',
  tutor: 'tutor',
  protection: 'protection',
  recursion: 'recursion',
  counterspell: 'counterspell',
};

/** Limite do parâmetro `q` da busca do Scryfall. */
const MAX_QUERY = 1000;

const quoted = (name: string) => `!"${name.replace(/"/g, '')}"`;

/** Divide os nomes em buscas `otag:x (!"A" or !"B" …)` que cabem no limite de 1000 caracteres. */
export function buildTagQueries(tag: string, names: readonly string[]): string[] {
  const prefix = `otag:${tag} (`;
  const queries: string[] = [];
  let current: string[] = [];
  const length = (parts: string[]) => prefix.length + parts.join(' or ').length + 1;
  for (const name of [...new Set(names)]) {
    const next = [...current, quoted(name)];
    if (current.length && length(next) > MAX_QUERY) {
      queries.push(`${prefix}${current.join(' or ')})`);
      current = [quoted(name)];
    } else {
      current = next;
    }
  }
  if (current.length) queries.push(`${prefix}${current.join(' or ')})`);
  return queries;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Consulta o Tagger para os nomes informados: uma busca por função e lote de nomes
 * (100 cartas ≈ 8 funções × 2–3 lotes). Retorna as funções de cada carta (nome em minúsculas).
 */
export async function fetchCardRoles(
  names: readonly string[],
  options: { fetch: FetchLike; delayMs?: number; userAgent?: string },
): Promise<Map<string, TaggerRole[]>> {
  const roles = new Map<string, TaggerRole[]>(
    names.map((n) => [n.toLowerCase(), [] as TaggerRole[]]),
  );
  const delayMs = options.delayMs ?? 100;
  let first = true;
  for (const role of TAGGER_ROLES) {
    for (const q of buildTagQueries(ROLE_OTAG[role], names)) {
      if (!first && delayMs > 0) await sleep(delayMs);
      first = false;
      const response = await options.fetch(
        `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(q)}&unique=cards`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': options.userAgent ?? 'BoraMarcar/1.0',
          },
        },
      );
      // 404 = nenhuma carta do lote tem essa função.
      if (response.status === 404) continue;
      if (!response.ok) {
        throw new DomainError('upstream_error', `Scryfall respondeu ${response.status}`);
      }
      const body = (await response.json()) as { data?: { name: string }[] };
      for (const card of body.data ?? []) {
        const keys = [card.name.toLowerCase(), card.name.split(' // ')[0]!.toLowerCase()];
        for (const key of keys) {
          const list = roles.get(key);
          if (list && !list.includes(role)) list.push(role);
        }
      }
    }
  }
  return roles;
}
