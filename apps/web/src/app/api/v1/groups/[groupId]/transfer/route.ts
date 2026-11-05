import { transferOwnership } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ userId: z.string().min(1) });

/** Transfere a posse do grupo; o dono atual vira admin. */
export const POST = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const { userId } = await parseJson(req, schema);
  await transferOwnership(db, { groupId: params.groupId, ownerId: user.id, newOwnerId: userId });
  return { ownerId: userId };
});
