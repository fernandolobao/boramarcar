import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { cronRuns } from '../schema';

/**
 * Roda `fn` no máximo uma vez por tarefa e período (ex.: o e-mail de métricas da semana). Marca
 * antes de rodar: um cron em dobro ao mesmo tempo não manda duas vezes. Se `fn` falhar, a marca sai
 * e a próxima execução tenta de novo. Devolve `{ skipped: true }` quando já tinha sido feito.
 */
export async function onceFor<T>(
  db: Database,
  task: string,
  period: string,
  fn: () => Promise<T>,
): Promise<{ skipped: true } | { skipped: false; result: T }> {
  const claimed = await db
    .insert(cronRuns)
    .values({ task, period })
    .onConflictDoNothing()
    .returning({ task: cronRuns.task });
  if (!claimed.length) return { skipped: true };
  try {
    return { skipped: false, result: await fn() };
  } catch (error) {
    await db.delete(cronRuns).where(and(eq(cronRuns.task, task), eq(cronRuns.period, period)));
    throw error;
  }
}
