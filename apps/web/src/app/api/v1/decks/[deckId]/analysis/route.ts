import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { authed } from '@/server/http';
import { rateLimit } from '@/server/limits';

/** Atualiza a análise com o Scryfall Tagger e o Commander Spellbook (quem pode ver o deck). */
export const POST = authed<{ deckId: string }>(async ({ db, user, params }) => {
  await rateLimit(db, user.id, 'analysis');
  return refreshDeckAnalysis(db, { deckId: params.deckId, viewerId: user.id });
});
