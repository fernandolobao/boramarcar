import { notifyMonthlyRecaps, onceFor } from '@boramarcar/db';
import { runCron, runSteps } from '@/server/cron';
import { getDb } from '@/server/db';
import { sendBetaWelcomes } from '@/server/beta';
import { sendMetricsEmail } from '@/server/metrics-email';
import { sendDueReminders } from '@/server/notify';
import { draftWeeklyNews } from '@/server/weekly-news';

export const dynamic = 'force-dynamic';

/**
 * Cron diário da Vercel (vercel.json): lembra dos encontros das próximas 24h, manda as
 * boas-vindas aos grupos do beta quando ele começa (8.5) e, às segundas, o resumo semanal das
 * métricas para ADMIN_EMAILS e o rascunho das novidades da semana para um admin aprovar; na
 * primeira semana do mês, o aviso da retrospectiva do mês aos grupos que jogaram.
 *
 * Cada tarefa roda mesmo que outra falhe (`runSteps`); o que é semanal sai uma vez por semana
 * mesmo se o cron rodar de novo (`onceFor`); a retrospectiva tenta do dia 1 ao 7, sem repetir para
 * o mesmo grupo e mês, então uma falha no dia 1 não perde o mês.
 */
export async function GET(req: Request) {
  return runCron(req, 'lembretes-diarios', '17 11 * * *', async () => {
    const db = getDb();
    const now = new Date();
    const monday = now.getUTCDay() === 1;
    const week = now.toISOString().slice(0, 10);
    const steps = await runSteps({
      reminders: () => sendDueReminders(db),
      metricsEmails: async () => {
        if (!monday) return 0;
        const run = await onceFor(
          db,
          'metrics-email',
          week,
          async () => (await sendMetricsEmail(db, now)).length,
        );
        return run.skipped ? 0 : run.result;
      },
      newsDrafted: async () => {
        if (!monday) return false;
        const run = await onceFor(db, 'weekly-news', week, () => draftWeeklyNews(db, now));
        return run.skipped ? false : run.result.drafted;
      },
      betaWelcomes: () => sendBetaWelcomes(db, now),
      monthlyRecaps: async () => (now.getUTCDate() <= 7 ? notifyMonthlyRecaps(db, now) : 0),
    });
    const { reminders, ...rest } = steps;
    return { ...reminders, ...rest };
  });
}
