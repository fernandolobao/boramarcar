import {
  checkPodium,
  notifyAchievementsFromGame,
  notifyGameRecorded,
  recordGame,
} from '@boramarcar/db';
import { runAfterResponse } from '@/server/background';
import { gameSchema } from '@/server/game-schema';
import { authed, parseJson } from '@/server/http';
import { sendEventRecap } from '@/server/recap';
import { track } from '@/server/activity';

export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, gameSchema);
    const game = await recordGame(db, { ...body, eventId: params.eventId, userId: user.id });
    // Partida registrada depois de finalizar: o resumo sai agora (se ainda não saiu).
    runAfterResponse(() => sendEventRecap(db, params.eventId));
    // Central de notificações: quem jogou e o resto do grupo.
    runAfterResponse(async () => {
      await notifyGameRecorded(db, { gameId: game.id, actorId: user.id });
      await notifyAchievementsFromGame(db, { gameId: game.id });
      await checkPodium(db, { groupId: game.groupId, actorId: user.id });
    });
    track({
      userId: user.id,
      kind: 'game_recorded',
      groupId: game.groupId,
      targetId: params.eventId,
    });
    return { game };
  },
  { status: 201 },
);
