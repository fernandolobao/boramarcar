import { startStoreTournament } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Começa o torneio do evento de loja com quem fez check-in (equipe da loja). */
export const POST = authed<{ eventId: string }>(
  async ({ db, user, params }) => {
    const tournament = await startStoreTournament(db, { eventId: params.eventId, userId: user.id });
    return { tournament: { id: tournament.id } };
  },
  { status: 201 },
);
