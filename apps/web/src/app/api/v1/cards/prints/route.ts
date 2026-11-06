import { z } from 'zod';
import { listCardPrints } from '@/server/deck-import';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({ name: z.string().trim().min(1).max(200) });

/** Edições (impressões) de uma carta, para escolher no editor de deck. */
export const GET = authed(async ({ req }) => {
  const { name } = parseQuery(req, schema);
  const prints = await listCardPrints(name);
  return Response.json({ prints }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
});
