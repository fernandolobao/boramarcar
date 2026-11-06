import { GAME_FORMATS } from '@boramarcar/core';
import { getGroupStats } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseQuery } from '@/server/http';

const schema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: z.enum(GAME_FORMATS).optional(),
});

/** Estatísticas do grupo: sequências, confronto direto, quem começa, decks e comandantes. */
export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const query = parseQuery(req, schema);
  return { stats: await getGroupStats(db, { ...query, groupId: params.groupId, userId: user.id }) };
});
