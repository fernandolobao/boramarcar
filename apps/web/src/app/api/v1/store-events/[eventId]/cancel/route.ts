import { cancelStoreEvent } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Cancela o evento da loja (equipe). */
export const POST = authed<{ eventId: string }>(async ({ db, user, params }) => {
  await cancelStoreEvent(db, { eventId: params.eventId, userId: user.id });
  return { cancelled: true };
});
