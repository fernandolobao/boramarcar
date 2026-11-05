import { getEventDetail, updateEvent } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson } from '@/server/http';

export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => ({
  event: await getEventDetail(db, { eventId: params.eventId, userId: user.id }),
}));

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.nullish(),
    locationId: z.string().nullish(),
    status: z.enum(['scheduled', 'cancelled', 'finished']).optional(),
  })
  .strict();

/** Edita o encontro (título, horário, local) ou muda o status: cancelar, finalizar, reabrir. */
export const PATCH = authed<{ eventId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, patchSchema);
  return { event: await updateEvent(db, { ...body, eventId: params.eventId, userId: user.id }) };
});
