import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireMembership, type Database } from '@boramarcar/db';
import { getBaseUrl, getEnv } from '@/env';

/**
 * Retrospectiva do mês (8.12): o endereço leva um código por grupo e mês (HMAC com o segredo do
 * servidor). Quem recebe o link de outubro não abre setembro nem os meses seguintes trocando a data;
 * sem o código, só quem é do grupo e está logado vê.
 */
export function monthlyKey(groupId: string, month: string): string {
  return createHmac('sha256', getEnv().BETTER_AUTH_SECRET)
    .update(`retrospectiva:${groupId}:${month}`)
    .digest('base64url')
    .slice(0, 22);
}

function validKey(groupId: string, month: string, key: string | undefined): boolean {
  if (!key) return false;
  const expected = Buffer.from(monthlyKey(groupId, month));
  const given = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Pode ver a retrospectiva: código certo, ou membro do grupo logado. */
export async function canSeeMonthlyRecap(
  db: Database,
  input: { groupId: string; month: string; key: string | undefined; userId: string | null },
): Promise<boolean> {
  if (validKey(input.groupId, input.month, input.key)) return true;
  if (!input.userId) return false;
  return requireMembership(db, input.groupId, input.userId).then(
    () => true,
    () => false,
  );
}

/** Endereço para compartilhar (com o código). */
export const monthlyUrl = (groupId: string, month: string) =>
  `${getBaseUrl()}/retrospectiva/${groupId}/${month}?k=${monthlyKey(groupId, month)}`;
