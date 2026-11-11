import { GAME_FORMATS } from '@boramarcar/core';
import { getDeckRatings, listDecks } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { importDeck } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

export const GET = authed(async ({ db, user }) => {
  const decks = await listDecks(db, user.id);
  const ratings = await getDeckRatings(
    db,
    decks.map((d) => d.id),
  );
  return {
    decks: decks.map((d) => ({
      ...d,
      score: ratings.get(d.id)?.score ?? null,
      bracket: ratings.get(d.id)?.bracket ?? null,
    })),
  };
});

const importSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('url'),
    url: z.url(),
    name: z.string().trim().max(120).optional(),
    format: z.enum(GAME_FORMATS).optional(),
  }),
  z.object({
    kind: z.literal('text'),
    name: z.string().trim().max(120).optional(),
    text: z.string().min(1).max(50_000),
    format: z.enum(GAME_FORMATS).optional(),
  }),
]);

export const POST = authed(
  async ({ req, db, user }) => {
    const { format, ...input } = await parseJson(req, importSchema);
    const result = await importDeck(db, user.id, input, fetch, format);
    // Tagger e Spellbook em segundo plano: a importação não espera por eles.
    runAfterResponse(() => refreshDeckAnalysis(db, { deckId: result.deck.id, viewerId: user.id }));
    return result;
  },
  { status: 201 },
);
