import { getEventDetail, getEventSnapshot, updateEvent } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson } from '@/server/http';
import { eventChangeKind, notifyEvent } from '@/server/notify';
import { runAfterResponse } from '@/server/background';
import { sendEventRecap } from '@/server/recap';

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
  const before = await getEventSnapshot(db, params.eventId);
  const event = await updateEvent(db, { ...body, eventId: params.eventId, userId: user.id });
  const kind = before ? eventChangeKind(before, event) : null;
  if (kind) {
    runAfterResponse(() => notifyEvent(db, { eventId: event.id, kind, actorId: user.id }));
  }
  // Finalizou: resumo da noite para quem jogou (uma vez por encontro).
  if (before?.status !== 'finished' && event.status === 'finished') {
    runAfterResponse(() => sendEventRecap(db, event.id));
  }
  return { event };
});
