import { GAME_FORMATS } from '@boramarcar/core';
import { STORE_EVENT_KINDS } from '@boramarcar/core/stores';
import { updateStoreEvent } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  format: z.enum(GAME_FORMATS).optional(),
  kind: z.enum(STORE_EVENT_KINDS).optional(),
  capacity: z.number().int().min(1).max(512).nullable().optional(),
  prizes: z.string().max(2000).nullable().optional(),
  rules: z.string().max(2000).nullable().optional(),
});

/** Edita o evento da loja (equipe). Mais vagas sobem a lista de espera. */
export const PATCH = authed<{ eventId: string }>(async ({ req, db, user, params }) => {
  await updateStoreEvent(db, {
    ...(await parseJson(req, schema)),
    eventId: params.eventId,
    userId: user.id,
  });
  return { saved: true };
});
