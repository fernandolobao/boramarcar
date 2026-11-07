import { createLocation, listLocations, requireMembership } from '@boramarcar/db';
import { locationSchema } from '@/server/location-schema';
import { authed, parseJson } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => {
  await requireMembership(db, params.groupId, user.id);
  return { locations: await listLocations(db, params.groupId) };
});

export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const body = await parseJson(req, locationSchema);
    return {
      location: await createLocation(db, { ...body, groupId: params.groupId, userId: user.id }),
    };
  },
  { status: 201 },
);
