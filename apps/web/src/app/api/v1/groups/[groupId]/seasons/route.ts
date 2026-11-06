import { createSeason, listSeasons } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => ({
  seasons: await listSeasons(db, { groupId: params.groupId, userId: user.id }),
}));

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  startsAt: isoDate,
  /** Fim exclusivo (o cliente envia o dia seguinte ao último dia, às 00:00 no fuso do usuário). */
  endsAt: isoDate,
});

/** Cria uma temporada do ranking (dono/admin). */
export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, schema);
    return {
      season: await createSeason(db, { ...body, groupId: params.groupId, userId: user.id }),
    };
  },
  { status: 201 },
);
