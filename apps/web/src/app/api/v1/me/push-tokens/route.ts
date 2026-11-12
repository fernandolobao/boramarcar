import { isExpoPushToken } from '@boramarcar/core/push';
import { registerPushToken, removePushToken } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const token = z.string().max(200).refine(isExpoPushToken, 'Token do Expo inválido');

const registerSchema = z.object({ token, platform: z.enum(['ios', 'android']) });

/** Liga as notificações push neste aparelho (app mobile). Repetir só atualiza a data de uso. */
export const POST = authed(async ({ req, db, user }) => {
  const body = await parseJson(req, registerSchema);
  await registerPushToken(db, { userId: user.id, ...body });
  return { registered: true };
});

/** Desliga as notificações push neste aparelho (ex.: ao sair da conta ou no ajuste do app). */
export const DELETE = authed(async ({ req, db, user }) => {
  const body = await parseJson(req, z.object({ token }));
  await removePushToken(db, { userId: user.id, token: body.token });
  return { removed: true };
});
