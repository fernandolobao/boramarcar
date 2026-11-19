import { STORE_INVITE_DAYS } from '@boramarcar/core/stores';
import { createStore, listStoresForAdmin } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { runAfterResponse } from '@/server/background';
import { buildStoreInviteEmail, deliverEmails } from '@/server/email';
import { authed, parseJson } from '@/server/http';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Código IBGE do município (7 dígitos). */
  municipalityCode: z.string().regex(/^\d{7}$/),
  email: z.string().trim().email().max(200),
});

/** Lojas (admin do ArcanaKin), com o e-mail de contato, a equipe e o selo. */
export const GET = authed(async ({ db, user }) => {
  assertAdmin(user.email);
  return { stores: await listStoresForAdmin(db) };
});

/** Cria a loja e manda o convite de dono por e-mail (10.1). */
export const POST = authed(
  async ({ req, db, user }) => {
    assertAdmin(user.email);
    const input = await parseJson(req, schema);
    const { store, invite } = await createStore(db, { ...input, createdBy: user.id });
    runAfterResponse(() =>
      deliverEmails([
        buildStoreInviteEmail(invite.email, {
          storeName: store.name,
          role: 'owner',
          token: invite.token,
          days: STORE_INVITE_DAYS,
        }),
      ]),
    );
    return { store: { id: store.id, slug: store.slug } };
  },
  { status: 201 },
);
