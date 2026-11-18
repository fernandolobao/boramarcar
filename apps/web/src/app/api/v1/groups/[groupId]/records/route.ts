import { getGroupRecords } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Recordes e "cara do grupo" (8.12), para quem é do grupo. */
export const GET = authed<{ groupId: string }>(async ({ db, user, params }) =>
  getGroupRecords(db, { groupId: params.groupId, userId: user.id }),
);
