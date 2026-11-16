import { purgeExternalData } from '@boramarcar/db';
import { runCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { refreshScryfallCache } from '@/server/scryfall-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diário da Vercel (vercel.json): atualiza preços e dados das cartas usadas nos decks e
 * limpa o cache de serviços externos vencido há muito tempo e os contadores de limite antigos.
 */
export async function GET(req: Request) {
  return runCron(req, 'cache-scryfall', '43 6 * * *', async () => {
    const db = getDb();
    const cards = await refreshScryfallCache(db);
    const purged = await purgeExternalData(db);
    return { ...cards, purged };
  });
}
