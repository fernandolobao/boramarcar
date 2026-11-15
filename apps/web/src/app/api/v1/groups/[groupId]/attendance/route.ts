import { getGroupAttendance } from '@boramarcar/db';
import { authed } from '@/server/http';

/** "Quem anda sumido": presença de cada membro (só dono e admins). */
export const GET = authed<{ groupId: string }>(async ({ db, user, params }) =>
  getGroupAttendance(db, { groupId: params.groupId, userId: user.id }),
);
