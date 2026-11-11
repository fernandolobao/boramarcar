import { purgeExternalData } from '@boramarcar/db';
import { rejectUnauthorizedCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { refreshScryfallCache } from '@/server/scryfall-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diário da Vercel (vercel.json): atualiza preços e dados das cartas usadas nos decks e
 * limpa o cache de serviços externos vencido há muito tempo e os contadores de limite antigos.
 */
export async function GET(req: Request) {
  const rejected = rejectUnauthorizedCron(req);
  if (rejected) return rejected;
  try {
    const db = getDb();
    const cards = await refreshScryfallCache(db);
    const purged = await purgeExternalData(db);
    return Response.json({ ...cards, purged });
  } catch (error) {
    return errorResponse(error);
  }
}
