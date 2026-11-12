import { DEFAULT_TIME_ZONE } from '@boramarcar/core';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../client';
import { pushTokens, user } from '../schema';

export type PushPlatform = 'ios' | 'android';

/** Liga os avisos neste aparelho: guarda o token (ou o passa para quem entrou agora). */
export async function registerPushToken(
  db: Database,
  input: { userId: string; token: string; platform: PushPlatform; now?: Date },
) {
  const now = input.now ?? new Date();
  await db
    .insert(pushTokens)
    .values({ token: input.token, userId: input.userId, platform: input.platform, lastSeenAt: now })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: input.userId, platform: input.platform, lastSeenAt: now },
    });
}

/** Desliga os avisos neste aparelho (só o dono do token pode apagá-lo). */
export async function removePushToken(db: Database, input: { userId: string; token: string }) {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, input.token), eq(pushTokens.userId, input.userId)));
}

/** Apaga tokens que o Expo disse não existirem mais (app desinstalado, permissão retirada). */
export async function forgetPushTokens(db: Database, tokens: string[]) {
  if (tokens.length === 0) return;
  await db.delete(pushTokens).where(inArray(pushTokens.token, tokens));
}

/** Aparelho que recebe o aviso, com idioma e fuso da pessoa para montar o texto. */
export interface PushTarget {
  userId: string;
  token: string;
  locale: string | null;
  timeZone: string;
}

/** Tokens das pessoas (contas excluídas ficam de fora). */
export async function listPushTargets(db: Database, userIds: string[]): Promise<PushTarget[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .select({
      userId: pushTokens.userId,
      token: pushTokens.token,
      locale: user.locale,
      timeZone: user.timeZone,
    })
    .from(pushTokens)
    .innerJoin(user, eq(user.id, pushTokens.userId))
    .where(and(inArray(pushTokens.userId, userIds), isNull(user.deletedAt)));
  return rows.map((r) => ({ ...r, timeZone: r.timeZone ?? DEFAULT_TIME_ZONE }));
}
