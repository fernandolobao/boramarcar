import { recordGame } from '@boramarcar/db';
import { gameSchema } from '@/server/game-schema';
import { authed, parseJson } from '@/server/http';

export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, gameSchema);
    return { game: await recordGame(db, { ...body, eventId: params.eventId, userId: user.id }) };
  },
  { status: 201 },
);
