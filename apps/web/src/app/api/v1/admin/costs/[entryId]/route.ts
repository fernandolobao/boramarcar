import { deleteCostEntry } from '@boramarcar/db';
import { assertAdmin } from '@/server/admin';
import { authed } from '@/server/http';

/** Apaga um lançamento de custo. */
export const DELETE = authed<{ entryId: string }>(async ({ db, user, params }) => {
  assertAdmin(user.email);
  await deleteCostEntry(db, params.entryId);
});
