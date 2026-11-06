import { fetchScryfallAutocomplete } from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({ q: z.string().max(100).default('') });

/** Sugestões de nomes de carta para o editor de deck (Scryfall `/cards/autocomplete`). */
export const GET = authed(async ({ req }) => {
  const { q } = parseQuery(req, schema);
  const names = await fetchScryfallAutocomplete(q, { fetch: (u, i) => fetch(u, i) });
  return Response.json({ names }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
});
