import { joinGroup } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ inviteCode: z.string().trim().min(4).max(16) });

export const POST = authed(async ({ req, db, user }) => {
  const { inviteCode } = await parseJson(req, schema);
  return { group: await joinGroup(db, { inviteCode, userId: user.id }) };
});
