import { startTournament } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Fecha a inscrição e sorteia a 1ª rodada (quem organiza). */
export const POST = authed<{ tournamentId: string }>(async ({ db, user, params }) => {
  await startTournament(db, { tournamentId: params.tournamentId, userId: user.id });
  return { started: true };
});
