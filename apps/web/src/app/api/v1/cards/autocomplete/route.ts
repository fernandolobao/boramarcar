import { fetchScryfallAutocomplete } from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';
import { PUBLIC_CDN_CACHE, rateLimit } from '@/server/limits';

const schema = z.object({ q: z.string().max(100).default('') });

/**
 * Sugestões de nomes de carta para o editor de deck (Scryfall `/cards/autocomplete`). Iguais
 * para todos: ficam no CDN da Vercel.
 */
export const GET = authed(async ({ req, db, user }) => {
  const { q } = parseQuery(req, schema);
  await rateLimit(db, user.id, 'search');
  const names = await fetchScryfallAutocomplete(q, { fetch: (u, i) => fetch(u, i) });
  return Response.json({ names }, { headers: PUBLIC_CDN_CACHE });
});
