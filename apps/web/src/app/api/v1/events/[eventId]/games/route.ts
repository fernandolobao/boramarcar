import { recordGame } from '@boramarcar/db';
import { runAfterResponse } from '@/server/background';
import { gameSchema } from '@/server/game-schema';
import { authed, parseJson } from '@/server/http';
import { sendEventRecap } from '@/server/recap';

export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, gameSchema);
    const game = await recordGame(db, { ...body, eventId: params.eventId, userId: user.id });
    // Partida registrada depois de finalizar: o resumo sai agora (se ainda não saiu).
    runAfterResponse(() => sendEventRecap(db, params.eventId));
    return { game };
  },
  { status: 201 },
);
