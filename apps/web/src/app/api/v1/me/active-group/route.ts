import { requireMembership } from '@boramarcar/db';
import { z } from 'zod';
import { ACTIVE_GROUP_COOKIE } from '@/server/active-group';
import { preferenceCookie } from '@/server/cookies';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ groupId: z.string().min(1) });

export const PUT = authed(async ({ req, db, user }) => {
  const { groupId } = await parseJson(req, schema);
  await requireMembership(db, groupId, user.id);
  const response = Response.json({ groupId });
  response.headers.append('Set-Cookie', preferenceCookie(ACTIVE_GROUP_COOKIE, groupId));
  return response;
});
