import { joinGroup } from '@boramarcar/db';
import { z } from 'zod';
import { ACTIVE_GROUP_COOKIE } from '@/server/active-group';
import { preferenceCookie } from '@/server/cookies';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ inviteCode: z.string().trim().min(4).max(16) });

export const POST = authed(async ({ req, db, user }) => {
  const { inviteCode } = await parseJson(req, schema);
  const group = await joinGroup(db, { inviteCode, userId: user.id });
  // Quem entra por convite passa a ver o grupo novo como ativo.
  const response = Response.json({ group });
  response.headers.append('Set-Cookie', preferenceCookie(ACTIVE_GROUP_COOKIE, group.id));
  return response;
});
