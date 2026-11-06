import { rejectUnauthorizedCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { sendDueReminders } from '@/server/notify';

export const dynamic = 'force-dynamic';

/** Cron diário da Vercel (vercel.json): lembra dos encontros das próximas 24h. */
export async function GET(req: Request) {
  const rejected = rejectUnauthorizedCron(req);
  if (rejected) return rejected;
  try {
    return Response.json(await sendDueReminders(getDb()));
  } catch (error) {
    return errorResponse(error);
  }
}
