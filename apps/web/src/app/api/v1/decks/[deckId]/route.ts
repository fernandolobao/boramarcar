import { deleteDeck, getDeck } from '@boramarcar/db';
import { authed } from '@/server/http';

export const GET = authed<{ deckId: string }>(async ({ db, user, params }) => ({
  deck: await getDeck(db, { deckId: params.deckId, viewerId: user.id }),
}));

export const DELETE = authed<{ deckId: string }>(async ({ db, user, params }) => {
  await deleteDeck(db, { deckId: params.deckId, userId: user.id });
});
