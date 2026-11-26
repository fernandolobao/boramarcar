import { purgeActivity, purgeExternalData, purgeOldNotifications } from '@boramarcar/db';
import { runCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { refreshScryfallCache } from '@/server/scryfall-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diário da Vercel (vercel.json): atualiza preços e dados das cartas usadas nos decks e
 * limpa o cache de serviços externos vencido há muito tempo, os contadores de limite antigos e as
 * notificações lidas há mais de 180 dias e o registro de atividade com mais de 90 dias.
 */
export async function GET(req: Request) {
  return runCron(req, 'cache-scryfall', '43 6 * * *', async () => {
    const db = getDb();
    const cards = await refreshScryfallCache(db);
    const purged = await purgeExternalData(db);
    const oldNotifications = await purgeOldNotifications(db);
    const oldActivity = await purgeActivity(db);
    return { ...cards, purged, oldNotifications, oldActivity };
  });
}
