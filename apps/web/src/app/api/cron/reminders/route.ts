import { rejectUnauthorizedCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { sendBetaWelcomes } from '@/server/beta';
import { sendMetricsEmail } from '@/server/metrics-email';
import { sendDueReminders } from '@/server/notify';

export const dynamic = 'force-dynamic';

/**
 * Cron diário da Vercel (vercel.json): lembra dos encontros das próximas 24h, manda as
 * boas-vindas aos grupos do beta quando ele começa (8.5) e, às segundas, o resumo semanal das
 * métricas para ADMIN_EMAILS (sem cron novo).
 */
export async function GET(req: Request) {
  const rejected = rejectUnauthorizedCron(req);
  if (rejected) return rejected;
  try {
    const db = getDb();
    const reminders = await sendDueReminders(db);
    const now = new Date();
    const metrics = now.getUTCDay() === 1 ? (await sendMetricsEmail(db, now)).length : 0;
    const betaWelcomes = await sendBetaWelcomes(db, now);
    return Response.json({ ...reminders, metricsEmails: metrics, betaWelcomes });
  } catch (error) {
    return errorResponse(error);
  }
}
