import { registerByCode } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';

const schema = z.object({ code: z.string().min(1).max(20) });

/** Inscrição pelo código do balcão (com limite de tentativas: o código não deve ser adivinhado). */
export const POST = authed(
  async ({ req, db, user }) => {
    await rateLimit(db, user.id, 'storeCode');
    return {
      entry: await registerByCode(db, {
        code: (await parseJson(req, schema)).code,
        userId: user.id,
      }),
    };
  },
  { status: 201 },
);
