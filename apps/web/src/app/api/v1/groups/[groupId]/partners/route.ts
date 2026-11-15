import { listPartnerHints } from '@boramarcar/db';
import { authed } from '@/server/http';

/** "Com quem você ainda não jogou": até 3 membros do grupo para o painel. */
export const GET = authed<{ groupId: string }>(async ({ db, user, params }) =>
  listPartnerHints(db, { groupId: params.groupId, userId: user.id }),
);
