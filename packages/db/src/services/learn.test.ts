import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { getLearnProgress, setLessonCompleted } from './learn';
import { deleteUserAccount, exportUserData } from './privacy';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('progresso da trilha (12.1)', () => {
  it('marca, repete sem duplicar, desmarca e devolve na ordem da trilha', async () => {
    const u = await createTestUser(db);
    expect(await getLearnProgress(db, u.id)).toEqual([]);
    await setLessonCompleted(db, { userId: u.id, lessonId: 'combate', completed: true });
    await setLessonCompleted(db, { userId: u.id, lessonId: 'o-que-e-magic', completed: true });
    const again = await setLessonCompleted(db, {
      userId: u.id,
      lessonId: 'combate',
      completed: true,
    });
    expect(again).toEqual(['o-que-e-magic', 'combate']);
    expect(
      await setLessonCompleted(db, { userId: u.id, lessonId: 'combate', completed: false }),
    ).toEqual(['o-que-e-magic']);
  });

  it('entra na exportação de dados e some com a conta', async () => {
    const u = await createTestUser(db);
    await setLessonCompleted(db, { userId: u.id, lessonId: 'a-pilha', completed: true });
    const data = await exportUserData(db, u.id);
    expect(data.learn).toEqual([expect.objectContaining({ lesson: 'a-pilha' })]);
    await deleteUserAccount(db, u.id);
    expect(await getLearnProgress(db, u.id)).toEqual([]);
  });
});
