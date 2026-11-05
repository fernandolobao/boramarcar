import { regenerateInviteCode } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Gera um novo código de convite; o link e o QR Code antigos deixam de funcionar. */
export const POST = authed<{ groupId: string }>(async ({ db, user, params }) => {
  const group = await regenerateInviteCode(db, { groupId: params.groupId, userId: user.id });
  return { inviteCode: group.inviteCode };
});
