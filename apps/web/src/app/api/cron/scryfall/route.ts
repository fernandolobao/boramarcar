import { rejectUnauthorizedCron } from '@/server/cron';
import { getDb } from '@/server/db';
import { errorResponse } from '@/server/http';
import { refreshScryfallCache } from '@/server/scryfall-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cron diário da Vercel (vercel.json): atualiza preços e dados das cartas usadas nos decks. */
export async function GET(req: Request) {
  const rejected = rejectUnauthorizedCron(req);
  if (rejected) return rejected;
  try {
    return Response.json(await refreshScryfallCache(getDb()));
  } catch (error) {
    return errorResponse(error);
  }
}
