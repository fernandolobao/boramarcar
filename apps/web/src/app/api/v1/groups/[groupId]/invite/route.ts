import { regenerateInviteCode } from '@boramarcar/db';
import { authed } from '@/server/http';
import { rateLimit } from '@/server/limits';

/** Gera um novo código de convite; o link e o QR Code antigos deixam de funcionar. */
export const POST = authed<{ groupId: string }>(async ({ db, user, params }) => {
  await rateLimit(db, user.id, 'groups');
  const group = await regenerateInviteCode(db, { groupId: params.groupId, userId: user.id });
  return { inviteCode: group.inviteCode };
});
