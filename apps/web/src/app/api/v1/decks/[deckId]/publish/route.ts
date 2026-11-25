import { publishDeck } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Publica o rascunho (11.2): o deck vira de verdade e as cartas entram na coleção. Só o dono. */
export const POST = authed<{ deckId: string }>(async ({ db, user, params }) => ({
  deck: await publishDeck(db, { deckId: params.deckId, userId: user.id }),
}));
