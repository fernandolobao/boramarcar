import { deleteLocation, updateLocation } from '@boramarcar/db';
import { authed, parseJson } from '@/server/http';
import { locationSchema } from '@/server/location-schema';

type Params = { groupId: string; locationId: string };

/** Edita o local (dono/admin do grupo, quem cadastrou ou o anfitrião). */
export const PATCH = authed<Params>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, locationSchema.partial());
  return { location: await updateLocation(db, { ...body, ...params, userId: user.id }) };
});

/** Remove o local; encontros que o usavam ficam com "local a definir". */
export const DELETE = authed<Params>(async ({ db, user, params }) => {
  await deleteLocation(db, { ...params, userId: user.id });
  return { deleted: true };
});
