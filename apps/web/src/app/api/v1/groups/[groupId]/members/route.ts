import { listMembers, requireMembership } from '@boramarcar/db';
import { authed } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => {
  await requireMembership(db, params.groupId, user.id);
  return { members: await listMembers(db, params.groupId) };
});
