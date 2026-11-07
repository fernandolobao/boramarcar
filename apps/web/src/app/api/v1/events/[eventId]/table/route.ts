import { authed } from '@/server/http';
import { getTableSetup } from '@/server/table-setup';

/** Dados para montar o modo mesa (5.6) no app: jogadores do grupo, decks e o formato padrão. */
export const GET = authed<{ eventId: string }>(async ({ db, user, params }) => ({
  table: await getTableSetup(db, { eventId: params.eventId, userId: user.id }),
}));
