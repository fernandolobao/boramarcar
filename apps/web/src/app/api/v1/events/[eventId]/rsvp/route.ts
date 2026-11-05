import { setRsvp } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ rsvp: z.enum(['yes', 'maybe', 'no']) });

export const PUT = authed<{ eventId: string }>(async ({ req, db, user, params }) => {
  const { rsvp } = await parseJson(req, schema);
  await setRsvp(db, { eventId: params.eventId, userId: user.id, rsvp });
  return { rsvp };
});
