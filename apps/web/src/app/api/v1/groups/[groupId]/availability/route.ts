import { addAvailability, listAvailability } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson, parseQuery } from '@/server/http';
import { notifyNewWindows } from '@/server/notify';
import { runAfterResponse } from '@/server/background';

const DAY = 24 * 60 * 60 * 1000;

const rangeSchema = z
  .object({ from: isoDate.optional(), to: isoDate.optional() })
  .transform(({ from, to }) => {
    const start = from ?? new Date();
    return { from: start, to: to ?? new Date(start.getTime() + 30 * DAY) };
  });

export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const range = parseQuery(req, rangeSchema);
  return {
    slots: await listAvailability(db, { groupId: params.groupId, userId: user.id, ...range }),
  };
});

const createSchema = z.object({
  startsAt: isoDate,
  endsAt: isoDate,
  locationIds: z.array(z.string()).max(20).default([]),
  note: z.string().trim().max(200).nullish(),
});

export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, createSchema);
    const slot = await addAvailability(db, { ...body, groupId: params.groupId, userId: user.id });
    runAfterResponse(() => notifyNewWindows(db, { groupId: params.groupId, actorId: user.id }));
    return { slot };
  },
  { status: 201 },
);
