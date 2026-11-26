import { LEARN_ITEM_IDS } from '@boramarcar/core';
import { getLearnProgress, setLessonCompleted } from '@boramarcar/db';
import { z } from 'zod';
import { authed, parseJson } from '@/server/http';

const schema = z.object({ lessonId: z.enum(LEARN_ITEM_IDS), completed: z.boolean() });

/** Lições da trilha "Aprender a jogar" (12.1) que a pessoa já concluiu. */
export const GET = authed(async ({ db, user }) => ({
  completed: await getLearnProgress(db, user.id),
}));

/** Marca ou desmarca uma lição como concluída. */
export const POST = authed(async ({ req, db, user }) => {
  const { lessonId, completed } = await parseJson(req, schema);
  return {
    completed: await setLessonCompleted(db, { userId: user.id, lessonId, completed }),
  };
});
