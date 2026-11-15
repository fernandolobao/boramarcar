import { getEventPairings } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Confirmados do encontro e quantas vezes cada dupla já jogou junto (sugestão de mesas). */
export const GET = authed<{ eventId: string }>(async ({ db, user, params }) =>
  getEventPairings(db, { eventId: params.eventId, userId: user.id }),
);
