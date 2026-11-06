import { deleteSeason } from '@boramarcar/db';
import { authed } from '@/server/http';

export const DELETE = authed<{ seasonId: string }>(async ({ db, user, params }) => {
  await deleteSeason(db, { seasonId: params.seasonId, userId: user.id });
});
