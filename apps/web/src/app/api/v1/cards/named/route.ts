import { upsertCards } from '@boramarcar/db';
import { z } from 'zod';
import { resolveCardByName } from '@/server/deck-import';
import { authed, parseQuery } from '@/server/http';
import { PUBLIC_CDN_CACHE, rateLimit } from '@/server/limits';

const schema = z.object({ name: z.string().trim().min(1).max(200) });

/**
 * Carta pelo nome (cache local; senão, Scryfall), para abrir a carta em qualquer lugar em que só
 * o nome aparece. `card: null` quando o Scryfall não conhece o nome. Fica no CDN da Vercel.
 */
export const GET = authed(async ({ req, db, user }) => {
  const { name } = parseQuery(req, schema);
  await rateLimit(db, user.id, 'search');
  const card = await resolveCardByName(db, name);
  if (card) await upsertCards(db, [card]);
  return Response.json({ card }, { headers: PUBLIC_CDN_CACHE });
});
