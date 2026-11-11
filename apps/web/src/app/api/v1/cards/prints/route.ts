import { z } from 'zod';
import { listCardPrints } from '@/server/deck-import';
import { authed, parseQuery } from '@/server/http';
import { PUBLIC_CDN_CACHE, rateLimit } from '@/server/limits';

const schema = z.object({ name: z.string().trim().min(1).max(200) });

/**
 * Edições (impressões) de uma carta, para escolher no editor de deck. Guardadas no banco por 7
 * dias e no CDN da Vercel por 1 dia.
 */
export const GET = authed(async ({ req, db, user }) => {
  const { name } = parseQuery(req, schema);
  await rateLimit(db, user.id, 'search');
  const prints = await listCardPrints(db, name);
  return Response.json({ prints }, { headers: PUBLIC_CDN_CACHE });
});
