import { publishAnnouncement } from '@boramarcar/db';
import { assertAdmin } from '@/server/admin';
import { authed } from '@/server/http';

/** Publica o aviso: vira notificação para o público dele (todos ou um grupo). */
export const POST = authed<{ announcementId: string }>(async ({ db, user, params }) => {
  assertAdmin(user.email);
  const { recipients } = await publishAnnouncement(db, { id: params.announcementId });
  return { published: true, recipients };
});
