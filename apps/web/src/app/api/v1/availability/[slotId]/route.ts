import { deleteAvailability } from '@boramarcar/db';
import { authed } from '@/server/http';

export const DELETE = authed<{ slotId: string }>(async ({ db, user, params }) => {
  await deleteAvailability(db, { slotId: params.slotId, userId: user.id });
});
