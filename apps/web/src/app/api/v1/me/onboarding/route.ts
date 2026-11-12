import { markOnboarding, ONBOARDING_FLAGS } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ flag: z.enum(ONBOARDING_FLAGS) });

/** Registra uma escolha do onboarding, como "dispensou os primeiros passos" (Fase 7). */
export const POST = authed(async ({ req, db, user }) => {
  const { flag } = await parseJson(req, schema);
  await markOnboarding(db, { userId: user.id, flag });
  return { flag };
});
