import { searchEventHistory } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['scheduled', 'finished', 'cancelled']).optional(),
  playerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** Histórico de encontros (2.10) para o app: busca, situação, jogador e página (20 por vez). */
export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const query = parseQuery(req, querySchema);
  return {
    history: await searchEventHistory(db, {
      groupId: params.groupId,
      userId: user.id,
      q: query.q,
      status: query.status,
      playerId: query.playerId,
      page: query.page,
    }),
  };
});
