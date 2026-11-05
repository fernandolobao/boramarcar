import { deleteAvailabilityRule } from '@boramarcar/db';
import { authed } from '@/server/http';

export const DELETE = authed<{ ruleId: string }>(async ({ db, user, params }) => {
  await deleteAvailabilityRule(db, { ruleId: params.ruleId, userId: user.id });
});
