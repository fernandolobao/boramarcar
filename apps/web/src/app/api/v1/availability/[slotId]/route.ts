import { deleteAvailability } from '@boramarcar/db';
import { authed } from '@/server/http';
import { track } from '@/server/activity';

export const DELETE = authed<{ slotId: string }>(async ({ db, user, params }) => {
  await deleteAvailability(db, { slotId: params.slotId, userId: user.id });
  track({ userId: user.id, kind: 'availability_changed' });
});
