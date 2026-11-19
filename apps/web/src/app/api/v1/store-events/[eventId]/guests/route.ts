import { addGuestEntry } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ name: z.string().trim().min(1).max(60) });

/** Convidado sem conta, inscrito pela equipe da loja só com o nome. */
export const POST = authed<{ eventId: string }>(
  async ({ req, db, user, params }) => ({
    entry: await addGuestEntry(db, {
      eventId: params.eventId,
      userId: user.id,
      name: (await parseJson(req, schema)).name,
    }),
  }),
  { status: 201 },
);
