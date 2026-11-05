import { createGroup, listGroupsForUser } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

export const GET = authed(async ({ db, user }) => ({
  groups: await listGroupsForUser(db, user.id),
}));

const createSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const POST = authed(
  async ({ req, db, user }) => {
    const { name } = await parseJson(req, createSchema);
    return { group: await createGroup(db, { name, userId: user.id }) };
  },
  { status: 201 },
);
