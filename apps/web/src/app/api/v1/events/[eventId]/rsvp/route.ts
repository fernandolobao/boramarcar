import { setRsvp } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';
import { track } from '@/server/activity';

const schema = z.object({ rsvp: z.enum(['yes', 'maybe', 'no']) });

export const PUT = authed<{ eventId: string }>(async ({ req, db, user, params }) => {
  const { rsvp } = await parseJson(req, schema);
  await setRsvp(db, { eventId: params.eventId, userId: user.id, rsvp });
  // A resposta (yes, maybe, no) vai como rótulo; a tela traduz.
  track({ userId: user.id, kind: 'rsvp', targetId: params.eventId, label: rsvp });
  return { rsvp };
});
