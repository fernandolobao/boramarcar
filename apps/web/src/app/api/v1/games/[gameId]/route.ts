import { deleteGame } from '@boramarcar/db';
import { authed } from '@/server/http';

export const DELETE = authed<{ gameId: string }>(async ({ db, user, params }) => {
  await deleteGame(db, { gameId: params.gameId, userId: user.id });
});
