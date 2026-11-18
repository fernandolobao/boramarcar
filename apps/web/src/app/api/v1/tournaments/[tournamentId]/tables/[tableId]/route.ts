import { reportTable } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  gameWins: z.record(z.string().min(1).max(64), z.number().int().min(0).max(3)),
  gameDraws: z.number().int().min(0).max(3),
});

/**
 * Resultado da mesa: quem está nela (enquanto não tem resultado) ou quem organiza (também para
 * corrigir). Vale na hora e, se o torneio conta no ranking, vira partida do grupo.
 */
export const PUT = authed<{ tournamentId: string; tableId: string }>(
  async ({ req, db, user, params }) => {
    await reportTable(db, {
      ...(await parseJson(req, schema)),
      tableId: params.tableId,
      tournamentId: params.tournamentId,
      userId: user.id,
    });
    return { reported: true };
  },
);
