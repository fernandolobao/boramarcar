import { startStoreTournament } from '@boramarcar/db';
import { TOURNAMENT_STRUCTURES } from '@boramarcar/core/tournaments';
import { z } from 'zod';
import { authed } from '@/server/http';

/** Corpo opcional: o top cut (9.2). Sem corpo, só o suíço. */
const schema = z
  .object({
    topCut: z.number().int().min(2).max(16).nullable().optional(),
    structure: z.enum(TOURNAMENT_STRUCTURES).optional(),
  })
  .default({});

/** Começa o torneio do evento de loja com quem fez check-in (equipe da loja). */
export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => {
    const raw: unknown = await req.json().catch(() => undefined);
    const { topCut, structure } = schema.parse(raw);
    const tournament = await startStoreTournament(db, {
      eventId: params.eventId,
      userId: user.id,
      topCut,
      structure,
    });
    return { tournament: { id: tournament.id } };
  },
  { status: 201 },
);
