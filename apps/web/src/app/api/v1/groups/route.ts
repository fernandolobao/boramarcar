import { createGroup, listGroupsForUser } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';
import { track } from '@/server/activity';

export const GET = authed(async ({ db, user }) => ({
  groups: await listGroupsForUser(db, user.id),
}));

const createSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const POST = authed(
  async ({ req, db, user }) => {
    const { name } = await parseJson(req, createSchema);
    await rateLimit(db, user.id, 'groups');
    const group = await createGroup(db, { name, userId: user.id });
    track({
      userId: user.id,
      kind: 'group_created',
      groupId: group.id,
      targetId: group.id,
      label: group.name,
    });
    return { group };
  },
  { status: 201 },
);
