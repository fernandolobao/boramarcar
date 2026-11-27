import { compareWithCommanderDecks, getDeck } from '@boramarcar/db';
import { isAdmin } from '@/server/admin';
import { authed } from '@/server/http';

/**
 * Comparação (4.10) com outros decks do mesmo comandante que a pessoa pode ver, para o app (o
 * site calcula na própria página). Sem comandante, `null`. Quem não vê o deck recebe 404.
 */
export const GET = authed<{ deckId: string }>(async ({ db, user, params }) => {
  const deck = await getDeck(db, {
    deckId: params.deckId,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  });
  const comparison = deck.analysis.commanders.length
    ? await compareWithCommanderDecks(db, {
        deckId: deck.id,
        viewerId: user.id,
        format: deck.format,
        commanders: deck.analysis.commanders,
        entries: deck.entries,
      })
    : null;
  return { comparison };
});
