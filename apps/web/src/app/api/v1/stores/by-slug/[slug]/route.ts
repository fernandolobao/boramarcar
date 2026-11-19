import { DomainError } from '@boramarcar/core';
import { getStorePublic, isFollowingStore, listStoreEvents } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Perfil público da loja e os próximos eventos (para o app). Sem o e-mail de contato. */
export const GET = authed<{ slug: string }>(async ({ db, user, params }) => {
  const store = await getStorePublic(db, { slug: params.slug });
  if (!store) throw new DomainError('not_found', 'Loja não encontrada');
  const [upcoming, following] = await Promise.all([
    listStoreEvents(db, { storeId: store.id, when: 'upcoming' }),
    // Se quem pede segue a loja (10.4), para o botão "Seguir".
    isFollowingStore(db, { storeId: store.id, userId: user.id }),
  ]);
  return { store, upcoming, following };
});
