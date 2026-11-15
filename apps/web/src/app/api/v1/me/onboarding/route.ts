import { getGuideState, listDismissedTips, markOnboarding, ONBOARDING_FLAGS } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ flag: z.enum(ONBOARDING_FLAGS) });

/** Registra uma escolha do onboarding, como "dispensou os primeiros passos" (Fase 7). */
export const POST = authed(async ({ req, db, user }) => {
  const { flag } = await parseJson(req, schema);
  await markOnboarding(db, { userId: user.id, flag });
  return { flag };
});

/** Estado do onboarding: guia do primeiro acesso (7.1) e dicas dispensadas (7.4). */
export const GET = authed(async ({ db, user }) => ({
  guide: await getGuideState(db, { userId: user.id }),
  /** Dicas das telas (7.4) que a pessoa já dispensou. */
  tips: await listDismissedTips(db, { userId: user.id }),
}));
