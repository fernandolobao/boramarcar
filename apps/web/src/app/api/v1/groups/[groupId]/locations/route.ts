import { createLocation, listLocations, requireMembership } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => {
  await requireMembership(db, params.groupId, user.id);
  return { locations: await listLocations(db, params.groupId) };
});

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).nullish(),
  hostUserId: z.string().nullish(),
});

export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, schema);
    return {
      location: await createLocation(db, { ...body, groupId: params.groupId, userId: user.id }),
    };
  },
  { status: 201 },
);
