import { addAvailabilityRule, listAvailabilityRules } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

export const GET = authed<{ groupId: string }>(async ({ db, user, params }) => ({
  rules: await listAvailabilityRules(db, { groupId: params.groupId, userId: user.id }),
}));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const schema = z.object({
  /** Um ou mais dias da semana (0 = domingo); cria uma regra por dia. */
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startTime: time,
  endTime: time,
  timeZone: z.string().min(1).max(64),
  locationIds: z.array(z.string()).max(20).default([]),
  note: z.string().trim().max(200).nullish(),
});

export const POST = authed<{ groupId: string }>(
  async ({ req, db, user, params }) => {
    const { weekdays, ...body } = await parseJson(req, schema);
    const rules = [];
    for (const weekday of [...new Set(weekdays)].sort()) {
      rules.push(
        await addAvailabilityRule(db, {
          ...body,
          weekday,
          groupId: params.groupId,
          userId: user.id,
        }),
      );
    }
    return { rules };
  },
  { status: 201 },
);
