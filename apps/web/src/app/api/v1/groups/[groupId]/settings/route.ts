import { groupSettingsSchema } from '@boramarcar/core';
import { getGroupSettings, updateGroupSettings } from '@boramarcar/db';
import { authed, parseJson } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => ({
  settings: await getGroupSettings(db, { groupId: params.groupId, userId: user.id }),
}));

const schema = groupSettingsSchema.partial().strict();

/** Mesa, duração mínima, pontos do ranking e tipo de jogo padrão (dono/admin). */
export const PATCH = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  return {
    settings: await updateGroupSettings(db, { ...body, groupId: params.groupId, userId: user.id }),
  };
});
