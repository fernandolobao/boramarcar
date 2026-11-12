import { getOnboardingChecklist } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const onboarding = await import('../me/onboarding/route');

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

describe('POST /api/v1/me/onboarding', () => {
  it('aceita só as escolhas conhecidas e guarda o "dispensar"', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    asUser(ana);
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
    const groupId = created.body!.group.id as string;

    const bad = await call(onboarding.POST, { method: 'POST', body: { flag: 'qualquer' } });
    expect(bad.status).toBe(400);
    const ok = await call(onboarding.POST, {
      method: 'POST',
      body: { flag: 'checklist-dismissed' },
    });
    expect(ok.status).toBe(200);
    const checklist = await getOnboardingChecklist(testState.db!, { userId: ana.id, groupId });
    expect(checklist.dismissed).toBe(true);
  });
});
