import { suggestGameWindows } from '@boramarcar/db';
import { z } from 'zod';
import { authed, isoDate, parseQuery } from '@/server/http';

const DAY = 24 * 60 * 60 * 1000;

const schema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  minPlayers: z.coerce.number().int().min(2).max(8).default(4),
  minDurationMinutes: z.coerce
    .number()
    .int()
    .min(30)
    .max(24 * 60)
    .default(120),
});

export const GET = authed<{ groupId: string }>(async ({ req, db, user, params }) => {
  const query = parseQuery(req, schema);
  const from = query.from ?? new Date();
  const to = query.to ?? new Date(from.getTime() + 30 * DAY);
  return {
    windows: await suggestGameWindows(db, {
      groupId: params.groupId,
      userId: user.id,
      from,
      to,
      minPlayers: query.minPlayers,
      minDurationMinutes: query.minDurationMinutes,
    }),
  };
});
