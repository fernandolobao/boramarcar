import { LESSON_IDS, type LessonId } from '@boramarcar/core';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { learnProgress } from '../schema';

/** Lições concluídas pela pessoa (12.1), na ordem da trilha. */
export async function getLearnProgress(db: Database, userId: string): Promise<LessonId[]> {
  const rows = await db
    .select({ lessonId: learnProgress.lessonId })
    .from(learnProgress)
    .where(eq(learnProgress.userId, userId));
  const done = new Set(rows.map((r) => r.lessonId));
  return LESSON_IDS.filter((id) => done.has(id));
}

/** Marca (ou desmarca) uma lição como concluída. Marcar de novo não muda a data. */
export async function setLessonCompleted(
  db: Database,
  input: { userId: string; lessonId: LessonId; completed: boolean },
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
