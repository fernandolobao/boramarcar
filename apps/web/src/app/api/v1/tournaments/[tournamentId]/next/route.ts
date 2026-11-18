import { nextRound } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Próxima rodada, quando todas as mesas têm resultado; depois da última, encerra (quem organiza). */
export const POST = authed<{ tournamentId: string }>(async ({ db, user, params }) =>
  nextRound(db, { tournamentId: params.tournamentId, userId: user.id }),
);
