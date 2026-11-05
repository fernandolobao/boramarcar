import { requireMembership } from '@boramarcar/db';
import { z } from 'zod';
import { ACTIVE_GROUP_COOKIE } from '@/server/active-group';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ groupId: z.string().min(1) });

export const PUT = authed(async ({ req, db, user }) => {
  const { groupId } = await parseJson(req, schema);
  await requireMembership(db, groupId, user.id);
  const response = Response.json({ groupId });
  response.headers.append(
    'Set-Cookie',
    `${ACTIVE_GROUP_COOKIE}=${encodeURIComponent(groupId)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  );
  return response;
});
