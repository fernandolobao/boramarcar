import { deleteGame, updateGame } from '@boramarcar/db';
import { gameSchema } from '@/server/game-schema';
import { authed, parseJson } from '@/server/http';

/** Edita a partida inteira (jogadores, resultado, decks e detalhes). */
export const PUT = authed<{ gameId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, gameSchema);
  return { game: await updateGame(db, { ...body, gameId: params.gameId, userId: user.id }) };
});

export const DELETE = authed<{ gameId: string }>(async ({ db, user, params }) => {
  await deleteGame(db, { gameId: params.gameId, userId: user.id });
});
