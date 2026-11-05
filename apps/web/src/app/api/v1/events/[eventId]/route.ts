import { getEventDetail } from '@boramarcar/db';
import { authed } from '@/server/http';

export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => ({
  event: await getEventDetail(db, { eventId: params.eventId, userId: user.id }),
}));
