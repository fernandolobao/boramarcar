import { DomainError } from '@boramarcar/core';
import { getStorePublic, listStoreEvents } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Perfil público da loja e os próximos eventos (para o app). Sem o e-mail de contato. */
export const GET = authed<{ slug: string }>(async ({ db, params }) => {
  const store = await getStorePublic(db, { slug: params.slug });
  if (!store) throw new DomainError('not_found', 'Loja não encontrada');
  const upcoming = await listStoreEvents(db, { storeId: store.id, when: 'upcoming' });
  return { store, upcoming };
});
