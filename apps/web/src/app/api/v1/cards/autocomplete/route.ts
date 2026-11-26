import {
  fetchScryfallAutocomplete,
  fetchScryfallNamesInIdentity,
  fetchScryfallPrintedNames,
} from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';
import { PUBLIC_CDN_CACHE, rateLimit } from '@/server/limits';

const schema = z.object({
  q: z.string().max(100).default(''),
  /** Identidade de cor do comandante (ex.: `WU`; `C` = incolor): só cartas que cabem nela. */
  identity: z
    .string()
    .regex(/^[WUBRGC]{1,5}$/)
    .optional(),
});

/** Poucas sugestões em inglês: vale a pena procurar também pelo nome impresso em português. */
const FEW = 5;

/**
 * Sugestões de nomes de carta para o editor de deck e a coleção (Scryfall `/cards/autocomplete`,
 * só nomes em inglês). Com poucas sugestões, procura também pelo nome impresso em português
 * ("anel solar" → Sol Ring): `printed` traz o nome em português de cada sugestão que veio daí.
 * Iguais para todos: ficam no CDN da Vercel.
 */
export const GET = authed(async ({ req, db, user }) => {
  const { q, identity } = parseQuery(req, schema);
  await rateLimit(db, user.id, 'search');
  const fetchFn: typeof fetch = (u, i) => fetch(u, i);
  if (identity) {
    // Com o filtro da identidade (11.5): a busca do Scryfall, que entende `id<=…`.
    const colors = identity.replace('C', '').split('');
    const names = await fetchScryfallNamesInIdentity(q, colors, { fetch: fetchFn });
    return Response.json({ names, printed: {} }, { headers: PUBLIC_CDN_CACHE });
  }
  const names = await fetchScryfallAutocomplete(q, { fetch: fetchFn });
  const printed: Record<string, string> = {};
  if (names.length < FEW) {
    // A busca em português é um extra: se o Scryfall falhar, ficam as sugestões em inglês.
    const pt = await fetchScryfallPrintedNames(q, { fetch: fetchFn }).catch(() => []);
    for (const card of pt) {
      if (names.includes(card.name)) continue;
      names.push(card.name);
      printed[card.name] = card.printedName;
    }
  }
  return Response.json({ names, printed }, { headers: PUBLIC_CDN_CACHE });
});
