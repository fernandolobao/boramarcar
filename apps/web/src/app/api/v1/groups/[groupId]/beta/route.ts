import { getBetaBanner, requireMembership } from '@boramarcar/db';
import { BETA_WEEKS } from '@boramarcar/core';
import { authed } from '@/server/http';

/** Faixa do beta (8.5) no app: semana atual, se o grupo está no beta e a pessoa não dispensou. */
export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => {
  await requireMembership(db, params.groupId, user.id);
  const banner = await getBetaBanner(db, { groupId: params.groupId, userId: user.id });
  return { beta: banner ? { ...banner, weeks: BETA_WEEKS } : null };
});
