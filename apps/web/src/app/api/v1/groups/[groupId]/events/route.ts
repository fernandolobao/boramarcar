import { createEvent, listEvents } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson, parseQuery } from '@/server/http';
import { notifyEvent } from '@/server/notify';
import { runAfterResponse } from '@/server/background';

const listSchema = z.object({ when: z.enum(['upcoming', 'past', 'all']).default('all') });

export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const { when } = parseQuery(req, listSchema);
  return {
    events: await listEvents(db, {
      groupId: params.groupId,
      userId: user.id,
      when: when === 'all' ? undefined : when,
    }),
  };
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: isoDate,
  endsAt: isoDate.nullish(),
  locationId: z.string().nullish(),
  participantIds: z.array(z.string()).max(16).default([]),
});

export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, createSchema);
    const event = await createEvent(db, { ...body, groupId: params.groupId, userId: user.id });
    runAfterResponse(() =>
      notifyEvent(db, { eventId: event.id, kind: 'created', actorId: user.id }),
    );
    return { event };
  },
  { status: 201 },
);
