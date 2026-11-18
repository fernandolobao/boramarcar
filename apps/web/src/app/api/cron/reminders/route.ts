import { runCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { sendBetaWelcomes } from '@/server/beta';
import { sendMetricsEmail } from '@/server/metrics-email';
import { notifyMonthlyRecaps } from '@boramarcar/db';
import { sendDueReminders } from '@/server/notify';
import { draftWeeklyNews } from '@/server/weekly-news';

export const dynamic = 'force-dynamic';

/**
 * Cron diário da Vercel (vercel.json): lembra dos encontros das próximas 24h, manda as
 * boas-vindas aos grupos do beta quando ele começa (8.5) e, às segundas, o resumo semanal das
 * métricas para ADMIN_EMAILS e o rascunho das novidades da semana para um admin aprovar e, no dia
 * 1, o aviso da retrospectiva do mês aos grupos que jogaram (sem cron novo).
 */
export async function GET(req: Request) {
  return runCron(req, 'lembretes-diarios', '17 11 * * *', async () => {
    const db = getDb();
    const reminders = await sendDueReminders(db);
    const now = new Date();
    const monday = now.getUTCDay() === 1;
    const metrics = monday ? (await sendMetricsEmail(db, now)).length : 0;
    const news = monday ? await draftWeeklyNews(db, now) : { drafted: false, emails: 0 };
    const betaWelcomes = await sendBetaWelcomes(db, now);
    // Dia 1 (em UTC; o cron roda às 8h de Brasília): retrospectiva do mês anterior no sino.
    const monthlyRecaps = now.getUTCDate() === 1 ? await notifyMonthlyRecaps(db, now) : 0;
    return {
      ...reminders,
      metricsEmails: metrics,
      newsDrafted: news.drafted,
      betaWelcomes,
      monthlyRecaps,
    };
  });
}
