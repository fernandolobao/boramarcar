import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from '@boramarcar/core';
import { deleteAnnouncement, updateAnnouncement } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  title: z.string().max(ANNOUNCEMENT_TITLE_MAX).optional(),
  body: z.string().max(ANNOUNCEMENT_BODY_MAX).optional(),
  groupId: z.string().min(1).nullable().optional(),
});

/** Edita um rascunho. */
export const PATCH = authed<{ announcementId: string }>(async ({ req, db, user, params }) => {
  assertAdmin(user.email);
  const input = await parseJson(req, schema);
  return { announcement: await updateAnnouncement(db, { ...input, id: params.announcementId }) };
});

/** Exclui um rascunho. */
export const DELETE = authed<{ announcementId: string }>(async ({ db, user, params }) => {
  assertAdmin(user.email);
  await deleteAnnouncement(db, { id: params.announcementId });
});
