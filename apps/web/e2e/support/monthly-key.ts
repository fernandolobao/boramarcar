import { createHmac } from 'node:crypto';

/** O mesmo código de `server/monthly-link.ts`, com o segredo do servidor de teste. */
export function monthlyKey(groupId: string, month: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ausente no E2E');
  return createHmac('sha256', secret)
    .update(`retrospectiva:${groupId}:${month}`)
    .digest('base64url')
    .slice(0, 22);
}
