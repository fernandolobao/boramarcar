import { exportDeckText, slugify } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({
  format: z.enum(['plain', 'proxies']).default('plain'),
  download: z.enum(['0', '1']).default('0'),
});

/** Lista do deck em texto (Moxfield/Archidekt/Arena); `proxies` marca cópias proxy com #proxy. */
export const GET = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const { format, download } = parseQuery(req, schema);
  const deck = await getDeck(db, { deckId: params.deckId, viewerId: user.id });
  const text = exportDeckText(deck.lines, format);
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
      ...(download === '1'
        ? { 'Content-Disposition': `attachment; filename="${slugify(deck.name, 'deck')}.txt"` }
        : {}),
    },
  });
});
