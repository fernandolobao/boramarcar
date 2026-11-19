import { acceptStoreInvite } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Aceita o convite de loja: só a conta com o e-mail convidado, uma vez e no prazo. */
export const POST = authed<{ token: string }>(async ({ db, user, params }) => ({
  store: await acceptStoreInvite(db, {
    token: params.token,
    userId: user.id,
    userEmail: user.email,
  }),
}));
