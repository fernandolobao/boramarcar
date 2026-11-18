import { countUnreadNotifications, listNotifications } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Central de notificações: as mais recentes e quantas ainda não foram lidas. */
export const GET = authed(async ({ db, user }) => {
  const [items, unread] = await Promise.all([
    listNotifications(db, { userId: user.id }),
    countUnreadNotifications(db, { userId: user.id }),
  ]);
  return { items, unread };
});
