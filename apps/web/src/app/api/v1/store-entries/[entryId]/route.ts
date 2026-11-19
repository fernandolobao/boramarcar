import { cancelStoreEntry, setCheckIn } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ checkedIn: z.boolean() });

/** Check-in na chegada (equipe da loja). */
export const PATCH = authed<{ entryId: string }>(async ({ req, db, user, params }) => {
  const { checkedIn } = await parseJson(req, schema);
  await setCheckIn(db, { entryId: params.entryId, userId: user.id, checkedIn });
  return { checkedIn };
});

/** Desistir (a própria pessoa) ou tirar a inscrição (equipe). */
export const DELETE = authed<{ entryId: string }>(async ({ db, user, params }) => {
  await cancelStoreEntry(db, { entryId: params.entryId, userId: user.id });
  return { cancelled: true };
});
