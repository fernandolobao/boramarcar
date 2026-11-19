import { STORE_INVITE_DAYS } from '@boramarcar/core/stores';
import { getStoreName, inviteStoreMember } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { buildStoreInviteEmail, deliverEmails } from '@/server/email';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ email: z.string().trim().email().max(200) });

/** Convida alguém para a equipe da loja (o dono); o convite vai por e-mail. */
export const POST = authed<{ storeId: string }>(
  async ({ req, db, user, params }) => {
    const { email } = await parseJson(req, schema);
    const invite = await inviteStoreMember(db, { storeId: params.storeId, userId: user.id, email });
    const storeName = await getStoreName(db, params.storeId);
    runAfterResponse(() =>
      deliverEmails([
        buildStoreInviteEmail(invite.email, {
          storeName,
          role: 'staff',
          token: invite.token,
          days: STORE_INVITE_DAYS,
        }),
      ]),
    );
    return { invite: { id: invite.id, email: invite.email } };
  },
  { status: 201 },
);
