import { getBeta, listGroupsForBeta, saveBeta } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { runAfterResponse } from '@/server/background';
import { sendBetaWelcomes } from '@/server/beta';
import { authed, isoDate, parseJson } from '@/server/http';

const schema = z.object({
  groupIds: z.array(z.string().min(1)).max(50),
  startsAt: isoDate.nullable(),
});

/** Estado do beta e grupos para escolher. */
export const GET = authed(async ({ db, user }) => {
  assertAdmin(user.email);
  const [beta, groups] = await Promise.all([getBeta(db), listGroupsForBeta(db)]);
  return { ...beta, groups };
});

/** Salva os grupos e a data de início; se o beta já começou, manda as boas-vindas que faltam. */
export const PUT = authed(async ({ req, db, user }) => {
  assertAdmin(user.email);
  const input = await parseJson(req, schema);
  const beta = await saveBeta(db, input);
  if (beta.state.phase === 'running') runAfterResponse(() => sendBetaWelcomes(db));
  return beta;
});
