import { removeMember, setMemberRole } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ role: z.enum(['admin', 'member']) });

/** Promove a admin ou rebaixa a membro. */
export const PATCH = authed<{ groupId: string; userId: string }>(
  async ({ req, db, user, params }) => {
    const { role } = await parseJson(req, schema);
    await setMemberRole(db, {
      groupId: params.groupId,
      actorId: user.id,
      targetUserId: params.userId,
      role,
    });
    return { role };
  },
);

/** Remove um membro — ou sai do grupo, quando o alvo é o próprio usuário. */
export const DELETE = authed<{ groupId: string; userId: string }>(async ({ db, user, params }) =>
  removeMember(db, { groupId: params.groupId, actorId: user.id, targetUserId: params.userId }),
);
