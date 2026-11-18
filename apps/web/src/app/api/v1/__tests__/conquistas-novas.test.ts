import { createEvent, joinGroup, recordGame } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const fresh = await import('../me/achievements/new/route');
const seen = await import('../me/achievements/seen/route');

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

describe('conquistas novas na API', () => {
  it('lista as novas depois do ponto de partida e marca só as vistas', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    asUser(ana);
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
    const groupId = created.body!.group.id as string;
    const bia = await createTestUser(testState.db!, { name: 'Bia' });
    await joinGroup(testState.db!, {
      inviteCode: created.body!.group.inviteCode as string,
      userId: bia.id,
    });

    // Primeiro acesso: ponto de partida, nada a mostrar.
    expect((await call(fresh.GET)).body!.achievements).toEqual([]);

    const event = await createEvent(testState.db!, {
      groupId,
      userId: ana.id,
      title: 'X',
      startsAt: new Date('2026-01-01T22:00:00Z'),
    });
    await recordGame(testState.db!, {
      eventId: event.id,
      userId: ana.id,
      playedAt: new Date('2026-01-02T00:00:00Z'),
      players: [
        { userId: ana.id, result: 'win' },
        { userId: bia.id, result: 'loss' },
      ],
    });
    const list = (await call(fresh.GET)).body!.achievements as { id: string }[];
    expect(list.map((a) => a.id)).toEqual(expect.arrayContaining(['first_game', 'first_win']));

    const bad = await call(seen.POST, { method: 'POST', body: { ids: ['inventada'] } });
    expect(bad.status).toBe(400);
    const ok = await call(seen.POST, { method: 'POST', body: { ids: list.map((a) => a.id) } });
    expect(ok.status).toBe(204);
    expect((await call(fresh.GET)).body!.achievements).toEqual([]);
  });
});
