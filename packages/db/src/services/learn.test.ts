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

describe('conquistas da trilha', () => {
  it('concluir lições aparece nas conquistas da pessoa', async () => {
    const { getUserAchievements } = await import('./profiles');
    const u = await createTestUser(db);
    await setLessonCompleted(db, { userId: u.id, lessonId: 'combate', completed: true });
    const list = await getUserAchievements(db, u.id);
    expect(list.find((a) => a.id === 'learn_first')).toMatchObject({ unlocked: true });
    expect(list.find((a) => a.id === 'learn_path')).toMatchObject({ progress: 1, target: 7 });
  });
});

describe('pronto para a primeira mesa (12.5)', () => {
  it('quem concluiu o básico da trilha e ainda não jogou nenhuma partida', async () => {
    const { LEARN_TRACKS } = await import('@boramarcar/core');
    const { seedGroup } = await import('../test/helpers');
    const { createEvent, recordGame } = await import('./events');
    const { readyForFirstTable } = await import('./learn');
    const { group, players, owner } = await seedGroup(db, 3);
    const ana = players[0]!;
    const bia = players[1]!;
    const caio = players[2]!;
    const finish = async (userId: string, ids: readonly string[]) => {
      for (const lessonId of ids) {
        await setLessonCompleted(db, { userId, lessonId: lessonId as never, completed: true });
      }
    };
    await finish(ana.id, LEARN_TRACKS.basics);
    await finish(bia.id, LEARN_TRACKS.basics);
    await finish(caio.id, LEARN_TRACKS.basics.slice(0, 3));
    // Bia já jogou: não é mais "primeira mesa".
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Noite',
      startsAt: new Date('2026-11-20T22:00:00Z'),
    });
    await recordGame(db, {
      eventId: event.id,
      userId: owner.id,
      format: 'commander',
      players: [
        { userId: bia.id, result: 'win' },
        { userId: caio.id, result: 'loss' },
      ],
    });
    const ready = await readyForFirstTable(db, [ana.id, bia.id, caio.id]);
    expect([...ready]).toEqual([ana.id]);
    expect([...(await readyForFirstTable(db, []))]).toEqual([]);
  });
});
