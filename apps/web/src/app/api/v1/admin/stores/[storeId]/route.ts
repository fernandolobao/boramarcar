import { deleteStore, setStoreVerified } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ verified: z.boolean() });

/** Selo de loja verificada (admin do ArcanaKin). */
export const PATCH = authed<{ storeId: string }>(async ({ req, db, user, params }) => {
  assertAdmin(user.email);
  const { verified } = await parseJson(req, schema);
  await setStoreVerified(db, { storeId: params.storeId, verified });
  return { verified };
});

/** Exclui o perfil da loja (admin do ArcanaKin). */
export const DELETE = authed<{ storeId: string }>(async ({ db, user, params }) => {
  assertAdmin(user.email);
  await deleteStore(db, { storeId: params.storeId, userId: user.id, asAdmin: true });
  return { deleted: true };
});
