import { followStore, unfollowStore } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Segue a loja (10.4): eventos novos e avisos dela chegam no sino. */
export const PUT = authed<{ storeId: string }>(async ({ db, user, params }) => {
  await followStore(db, { storeId: params.storeId, userId: user.id });
  return { following: true };
});

/** Deixa de seguir a loja. */
export const DELETE = authed<{ storeId: string }>(async ({ db, user, params }) => {
  await unfollowStore(db, { storeId: params.storeId, userId: user.id });
  return { following: false };
});
