import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/env';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { sendDueReminders } from '@/server/notify';

export const dynamic = 'force-dynamic';

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Cron diário da Vercel (vercel.json): lembra dos encontros das próximas 24h.
 * A Vercel envia `Authorization: Bearer $CRON_SECRET`; sem o segredo configurado, a rota fica fechada.
 */
export async function GET(req: Request) {
  const secret = getEnv().CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || !matches(auth, `Bearer ${secret}`)) {
    return Response.json(
      { error: { code: 'unauthorized', message: 'Não autorizado' } },
      { status: 401 },
    );
  }
  try {
    return Response.json(await sendDueReminders(getDb()));
  } catch (error) {
    return errorResponse(error);
  }
}
