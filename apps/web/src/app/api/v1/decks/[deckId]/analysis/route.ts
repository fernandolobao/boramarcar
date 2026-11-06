import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { authed } from '@/server/http';

/** Atualiza a análise com o Scryfall Tagger e o Commander Spellbook (quem pode ver o deck). */
export const POST = authed<{ deckId: string }>(async ({ db, user, params }) =>
  refreshDeckAnalysis(db, { deckId: params.deckId, viewerId: user.id }),
);
