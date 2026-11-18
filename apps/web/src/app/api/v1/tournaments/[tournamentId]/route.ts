import { deleteTournament, getTournament } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Página do torneio: inscrições, rodadas, mesas, classificação e linha do tempo. */
export const GET = authed<{ tournamentId: string }>(async ({ db, user, params }) =>
  getTournament(db, { tournamentId: params.tournamentId, userId: user.id }),
);

/** Apaga o torneio (quem organiza); as partidas registradas continuam no grupo. */
export const DELETE = authed<{ tournamentId: string }>(async ({ db, user, params }) => {
  await deleteTournament(db, { tournamentId: params.tournamentId, userId: user.id });
  return { deleted: true };
});
