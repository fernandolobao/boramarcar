import { ACHIEVEMENT_IDS } from '@boramarcar/core';
import { markAchievementsSeen } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ ids: z.array(z.enum(ACHIEVEMENT_IDS)).max(ACHIEVEMENT_IDS.length) });

/** A pessoa fechou a janela: as conquistas mostradas nela contam como vistas. */
export const POST = authed(async ({ req, db, user }) => {
  const { ids } = await parseJson(req, schema);
  await markAchievementsSeen(db, { userId: user.id, ids });
  return undefined;
});
