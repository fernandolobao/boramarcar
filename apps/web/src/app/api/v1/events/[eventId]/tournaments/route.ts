import { GAME_FORMATS } from '@boramarcar/core';
import { createTournament } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const points = z.number().int().min(0).max(20);
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  format: z.enum(GAME_FORMATS),
  bestOf: z.union([z.literal(1), z.literal(3)]).optional(),
  points: z.object({ win: points, draw: points, loss: points }).optional(),
  rounds: z.number().int().min(1).max(15).nullable().optional(),
  countsInRanking: z.boolean().optional(),
});

/** Cria um torneio no encontro (dono ou admin do grupo), em qualquer formato (9.1). */
export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => ({
    tournament: await createTournament(db, {
      ...(await parseJson(req, schema)),
      eventId: params.eventId,
      userId: user.id,
    }),
  }),
  { status: 201 },
);
