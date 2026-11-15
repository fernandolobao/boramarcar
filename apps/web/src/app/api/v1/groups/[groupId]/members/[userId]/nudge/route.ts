import { nudgeMember } from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { authed, parseJson } from '@/server/http';
import { notifyEvent } from '@/server/notify';

const schema = z.object({ eventId: z.string().min(1).max(64) });

/**
 * "Chamar para o próximo" (dono e admins): registra o chamado e manda o aviso só para a pessoa,
 * por push e e-mail conforme a preferência dela. Um por pessoa por encontro (409 se repetir).
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
    runAfterResponse(() => notifyEvent(db, { eventId, kind: 'invite', userIds: [params.userId] }));
    return { nudged: true };
  },
  { status: 201 },
);
