import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { syncDeck } from '@/server/deck-import';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ text: z.string().max(50_000).optional() });

/** Atualiza o deck pela origem (ou por uma lista colada), mantendo os proxies. */
export const POST = authed<{ deckId: string }>(async ({ req, db, user, params }) => {
  const { text } = await parseJson(req, schema);
  const result = await syncDeck(db, {
    userId: user.id,
    deckId: params.deckId,
    text: text?.trim() || undefined,
  });
  runAfterResponse(() => refreshDeckAnalysis(db, { deckId: params.deckId, viewerId: user.id }));
  return result;
});
