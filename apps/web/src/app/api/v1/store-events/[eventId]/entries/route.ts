import { registerForStoreEvent } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Inscrição no evento de loja (quem tem conta). Sem vaga, entra na lista de espera. */
export const POST = authed<{ eventId: string }>(
  async ({ db, user, params }) => ({
    entry: await registerForStoreEvent(db, { eventId: params.eventId, userId: user.id }),
  }),
  { status: 201 },
);
