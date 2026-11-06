import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/env';

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Cron da Vercel: a requisição traz `Authorization: Bearer $CRON_SECRET`. Sem o segredo
 * configurado, as rotas de cron ficam fechadas. Retorna a resposta 401 ou `null` se autorizado.
 */
export function rejectUnauthorizedCron(req: Request): Response | null {
  const secret = getEnv().CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (secret && matches(auth, `Bearer ${secret}`)) return null;
  return Response.json(
    { error: { code: 'unauthorized', message: 'Não autorizado' } },
    { status: 401 },
  );
}
