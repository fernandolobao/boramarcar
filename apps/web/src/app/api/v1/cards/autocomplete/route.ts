import { fetchScryfallAutocomplete, fetchScryfallPrintedNames } from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';
import { PUBLIC_CDN_CACHE, rateLimit } from '@/server/limits';

const schema = z.object({ q: z.string().max(100).default('') });

/** Poucas sugestões em inglês: vale a pena procurar também pelo nome impresso em português. */
const FEW = 5;

/**
 * Sugestões de nomes de carta para o editor de deck e a coleção (Scryfall `/cards/autocomplete`,
 * só nomes em inglês). Com poucas sugestões, procura também pelo nome impresso em português
 * ("anel solar" → Sol Ring): `printed` traz o nome em português de cada sugestão que veio daí.
 * Iguais para todos: ficam no CDN da Vercel.
 */
export const GET = authed(async ({ req, db, user }) => {
  const { q } = parseQuery(req, schema);
  await rateLimit(db, user.id, 'search');
  const fetchFn: typeof fetch = (u, i) => fetch(u, i);
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
