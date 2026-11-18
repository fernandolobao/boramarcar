import { checkPodium, deleteGame, updateGame } from '@boramarcar/db';
import { runAfterResponse } from '@/server/background';
import { gameSchema } from '@/server/game-schema';
import { authed, parseJson } from '@/server/http';

/** Edita a partida inteira (jogadores, resultado, decks e detalhes). */
export const PUT = authed<{ gameId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, gameSchema);
  const game = await updateGame(db, { ...body, gameId: params.gameId, userId: user.id });
  // Resultado mudou: o pódio do grupo pode ter mudado.
  runAfterResponse(() => checkPodium(db, { groupId: game.groupId, actorId: user.id }));
  return { game };
});

export const DELETE = authed<{ gameId: string }>(async ({ db, user, params }) => {
  const { groupId } = await deleteGame(db, { gameId: params.gameId, userId: user.id });
  runAfterResponse(() => checkPodium(db, { groupId, actorId: user.id }));
});
