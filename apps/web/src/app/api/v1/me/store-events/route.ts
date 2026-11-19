import { listMyStoreEntries } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Próximos eventos de loja em que a pessoa está inscrita ou na fila. */
export const GET = authed(async ({ db, user }) => ({
  entries: await listMyStoreEntries(db, { userId: user.id }),
}));
