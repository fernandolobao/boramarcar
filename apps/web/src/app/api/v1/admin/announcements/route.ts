import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from '@boramarcar/core';
import { createAnnouncement, listAnnouncements, listGroupsForBeta } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  title: z.string().max(ANNOUNCEMENT_TITLE_MAX),
  body: z.string().max(ANNOUNCEMENT_BODY_MAX),
  groupId: z.string().min(1).nullable(),
});

/** Avisos (rascunhos e publicados) e os grupos para escolher o público. */
export const GET = authed(async ({ db, user }) => {
  assertAdmin(user.email);
  const [announcements, groups] = await Promise.all([listAnnouncements(db), listGroupsForBeta(db)]);
  return { announcements, groups };
});

/** Novo aviso, como rascunho. */
export const POST = authed(
  async ({ req, db, user }) => {
    assertAdmin(user.email);
    const input = await parseJson(req, schema);
    return { announcement: await createAnnouncement(db, { ...input, createdBy: user.id }) };
  },
  { status: 201 },
);
