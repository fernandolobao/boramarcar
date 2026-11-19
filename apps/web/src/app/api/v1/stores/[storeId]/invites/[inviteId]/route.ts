import { revokeStoreInvite } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Cancela um convite pendente da equipe (o dono). */
export const DELETE = authed<{ storeId: string; inviteId: string }>(
  async ({ db, user, params }) => {
    await revokeStoreInvite(db, {
      storeId: params.storeId,
      userId: user.id,
      inviteId: params.inviteId,
    });
    return { revoked: true };
  },
);
