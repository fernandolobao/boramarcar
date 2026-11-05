import { setAvailabilityRange } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseJson } from '@/server/http';

const schema = z.object({ start: isoDate, end: isoDate, available: z.boolean() });

/** Marca ou desmarca um intervalo na grade semanal (une/recorta disponibilidades avulsas). */
export const PUT = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  await setAvailabilityRange(db, { ...body, groupId: params.groupId, userId: user.id });
  return { available: body.available };
});
