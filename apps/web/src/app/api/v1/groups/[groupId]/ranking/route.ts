import { GAME_FORMATS } from '@boramarcar/core';
import { getGroupRanking } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseQuery } from '@/server/http';

const schema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: z.enum(GAME_FORMATS).optional(),
});

export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const range = parseQuery(req, schema);
  return getGroupRanking(db, { groupId: params.groupId, userId: user.id, ...range });
});
