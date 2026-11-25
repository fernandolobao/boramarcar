import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const learn = await import('../me/learn/route');

let close: () => Promise<void>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
});

describe('/api/v1/me/learn (12.1)', () => {
  it('sem conta: 401', async () => {
    expect((await call(learn.GET)).status).toBe(401);
  });

  it('marca e desmarca só lições que existem; cada pessoa vê o próprio progresso', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    const bia = await createTestUser(testState.db!, { name: 'Bia' });
    asUser(ana);
    const bad = await call(learn.POST, {
      method: 'POST',
      body: { lessonId: '../admin', completed: true },
    });
    expect(bad.status).toBe(400);
    const ok = await call(learn.POST, {
      method: 'POST',
      body: { lessonId: 'combate', completed: true },
    });
    expect(ok.body).toEqual({ completed: ['combate'] });
    expect((await call(learn.GET)).body).toEqual({ completed: ['combate'] });
    asUser(bia);
    expect((await call(learn.GET)).body).toEqual({ completed: [] });
    asUser(ana);
    const undone = await call(learn.POST, {
      method: 'POST',
      body: { lessonId: 'combate', completed: false },
    });
    expect(undone.body).toEqual({ completed: [] });
  });
});
