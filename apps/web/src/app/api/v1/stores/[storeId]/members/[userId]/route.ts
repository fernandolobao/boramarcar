import { removeStoreMember } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Tira alguém da equipe da loja (o dono; o último dono não sai). */
export const DELETE = authed<{ storeId: string; userId: string }>(async ({ db, user, params }) => {
  await removeStoreMember(db, {
    storeId: params.storeId,
    userId: user.id,
    memberId: params.userId,
  });
  return { removed: true };
});
