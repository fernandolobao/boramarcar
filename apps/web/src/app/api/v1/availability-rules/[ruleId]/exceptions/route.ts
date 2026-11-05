import { setRuleException } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ date: z.string(), skip: z.boolean() });

/** Marca/desmarca uma data em que a regra semanal não vale ("nesta quinta não posso"). */
export const PUT = authed<{ ruleId: string }>(async ({ req, db, user, params }) => {
  const body = await parseJson(req, schema);
  await setRuleException(db, { ...body, ruleId: params.ruleId, userId: user.id });
  return body;
});
