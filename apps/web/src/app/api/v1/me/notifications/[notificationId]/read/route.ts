import { DomainError } from '@boramarcar/core';
import { markNotificationRead } from '@boramarcar/db';
import { authed } from '@/server/http';

/** Marca uma notificação da própria pessoa como lida (de outra pessoa: 404). */
export const POST = authed<{ notificationId: string }>(async ({ db, user, params }) => {
  const ok = await markNotificationRead(db, { userId: user.id, id: params.notificationId });
  if (!ok) throw new DomainError('not_found', 'Notificação não encontrada');
  return undefined;
});
