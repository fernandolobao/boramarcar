import { GAME_RESULTS } from '@boramarcar/core';
import { recordGame } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson } from '@/server/http';

const schema = z.object({
  playedAt: isoDate.optional(),
  notes: z.string().trim().max(500).nullish(),
  players: z
    .array(
      z.object({
        userId: z.string(),
        result: z.enum(GAME_RESULTS),
        deckId: z.string().nullish(),
        seat: z.number().int().min(1).max(8).nullish(),
      }),
    )
    .min(2)
    .max(8),
});

export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, schema);
    return { game: await recordGame(db, { ...body, eventId: params.eventId, userId: user.id }) };
  },
  { status: 201 },
);
