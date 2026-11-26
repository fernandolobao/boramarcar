import { LEARN_ITEM_IDS, type LearnItemId } from '@boramarcar/core';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { learnProgress } from '../schema';

/** Lições (12.1) e desafios (12.4) concluídos pela pessoa, na ordem da trilha. */
export async function getLearnProgress(db: Database, userId: string): Promise<LearnItemId[]> {
  const rows = await db
    .select({ lessonId: learnProgress.lessonId })
    .from(learnProgress)
    .where(eq(learnProgress.userId, userId));
  const done = new Set(rows.map((r) => r.lessonId));
  return LEARN_ITEM_IDS.filter((id) => done.has(id));
}

/** Marca (ou desmarca) uma lição como concluída. Marcar de novo não muda a data. */
export async function setLessonCompleted(
  db: Database,
  input: { userId: string; lessonId: LearnItemId; completed: boolean },
) {
  if (input.completed) {
    await db
      .insert(learnProgress)
      .values({ userId: input.userId, lessonId: input.lessonId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(learnProgress)
      .where(
        and(eq(learnProgress.userId, input.userId), eq(learnProgress.lessonId, input.lessonId)),
      );
  }
  return getLearnProgress(db, input.userId);
}
