import { addEntrant } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ memberIds: z.array(z.string().min(1).max(64)).min(1).max(2) });

/** Inscreve uma pessoa (ou dupla, no 2HG): quem organiza inscreve qualquer um; os demais, a si. */
export const POST = authed<{ tournamentId: string }>(
  async ({ req, db, user, params }) => ({
    entrant: await addEntrant(db, {
      tournamentId: params.tournamentId,
      userId: user.id,
      memberIds: (await parseJson(req, schema)).memberIds,
    }),
  }),
  { status: 201 },
);
