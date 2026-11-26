import { COST_MONTH_RE } from '@boramarcar/core';
import { copyMonthlyCosts } from '@boramarcar/db';
import { z } from 'zod';
import { assertAdmin } from '@/server/admin';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ month: z.string().regex(COST_MONTH_RE) });

/** Repete no mês os lançamentos mensais do mês anterior. */
export const POST = authed(async ({ req, db, user }) => {
  assertAdmin(user.email);
  const { month } = await parseJson(req, schema);
  return { copied: await copyMonthlyCosts(db, month, user.id) };
});
