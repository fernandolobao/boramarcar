import { endBeta } from '@boramarcar/db';
import { authed } from '@/server/http';
import { assertAdmin } from '@/server/admin';

/** Encerra o beta antes das 8 semanas. */
export const POST = authed(async ({ db, user }) => {
  assertAdmin(user.email);
  return endBeta(db);
});
