import { markNotificationsRead } from '@boramarcar/db';
import { authed } from '@/server/http';

/** A pessoa abriu a central: tudo o que chegou até agora conta como lido. */
export const POST = authed(async ({ db, user }) => {
  await markNotificationsRead(db, { userId: user.id });
  return undefined;
});
