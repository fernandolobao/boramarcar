import { listTournaments } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Torneios do grupo (9.1), para quem é do grupo. */
export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => ({
  tournaments: await listTournaments(db, { groupId: params.groupId, userId: user.id }),
}));
