import { listDecks } from '@boramarcar/db';
import { z } from 'zod';
import { importDeck } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

export const GET = authed(async ({ db, user }) => ({ decks: await listDecks(db, user.id) }));

const importSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('url'), url: z.url(), name: z.string().trim().max(120).optional() }),
  z.object({
    kind: z.literal('text'),
    name: z.string().trim().max(120).optional(),
    text: z.string().min(1).max(50_000),
  }),
]);

export const POST = authed(
  async ({ req, db, user }) => {
    const input = await parseJson(req, importSchema);
    return importDeck(db, user.id, input);
  },
  { status: 201 },
);
