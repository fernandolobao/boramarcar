import { deleteAvailabilityRule } from '@boramarcar/db';
import { authed } from '@/server/http';
import { track } from '@/server/activity';

export const DELETE = authed<{ ruleId: string }>(async ({ db, user, params }) => {
  await deleteAvailabilityRule(db, { ruleId: params.ruleId, userId: user.id });
  track({ userId: user.id, kind: 'availability_changed' });
});
