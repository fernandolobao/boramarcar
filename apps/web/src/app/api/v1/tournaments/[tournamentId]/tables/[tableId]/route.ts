import { reportTable } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  gameWins: z.record(z.string().min(1).max(64), z.number().int().min(0).max(3)),
  gameDraws: z.number().int().min(0).max(3),
  /** Do modo mesa: quem começou, turno da vitória e duração (valem com uma partida só). */
  details: z
    .object({
      firstPlayerId: z.string().min(1).max(64).nullable().optional(),
      winningTurn: z.number().int().min(1).max(99).nullable().optional(),
      durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    })
    .optional(),
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
