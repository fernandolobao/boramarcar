import { addNotifications, nudgeMember } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { authed, parseJson } from '@/server/http';
import { notifyEvent } from '@/server/notify';

const schema = z.object({ eventId: z.string().min(1).max(64) });

/**
 * "Chamar para o próximo" (dono e admins): registra o chamado e avisa só a pessoa. O aviso na
 * central de notificações é gravado junto (não falha como push e e-mail), então o chamado
 * registrado sempre chega; push e e-mail vão depois, conforme a preferência dela. Um por pessoa
 * por encontro (409 se repetir).
 */
export const POST = authed<{ groupId: string; userId: string }>(
  async ({ req, db, user, params }) => {
    const { eventId } = await parseJson(req, schema);
    await nudgeMember(db, {
      groupId: params.groupId,
      actorId: user.id,
      targetUserId: params.userId,
      eventId,
    });
    await addNotifications(db, [
      { userId: params.userId, groupId: params.groupId, data: { kind: 'nudge', eventId } },
    ]);
    runAfterResponse(() => notifyEvent(db, { eventId, kind: 'invite', userIds: [params.userId] }));
    return { nudged: true };
  },
  { status: 201 },
);
