import { removeEntrant } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Tira a inscrição antes de começar (quem organiza, ou quem faz parte dela). */
export const DELETE = authed<{ tournamentId: string; entrantId: string }>(
  async ({ db, user, params }) => {
    await removeEntrant(db, {
      tournamentId: params.tournamentId,
      entrantId: params.entrantId,
      userId: user.id,
    });
    return { removed: true };
  },
);
