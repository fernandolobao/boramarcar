import { upsertCards } from '@boramarcar/db';
import { z } from 'zod';
import { resolveCardByName } from '@/server/deck-import';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({ name: z.string().trim().min(1).max(200) });

/**
 * Carta pelo nome (cache local; senão, Scryfall), para abrir a carta em qualquer lugar em que só
 * o nome aparece. `card: null` quando o Scryfall não conhece o nome.
 */
export const GET = authed(async ({ req, db }) => {
  const { name } = parseQuery(req, schema);
  const card = await resolveCardByName(db, name);
  if (card) await upsertCards(db, [card]);
  return Response.json({ card }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
});
