import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushBackground } from '@/test/setup';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const events = await import('../groups/[groupId]/events/route');
const games = await import('../events/[eventId]/games/route');
const inbox = await import('../me/notifications/route');
const read = await import('../me/notifications/read/route');
const readOne = await import('../me/notifications/[notificationId]/read/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let ana: U, bia: U, caio: U;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia, caio] = (await Promise.all(
    ['Ana', 'Bia', 'Caio'].map((name) => createTestUser(testDb.db, { name })),
  )) as [U, U, U];
});
afterAll(() => close());
beforeEach(() => {
  testState.user = null;
});

describe('central de notificações (API)', () => {
  it('partida registrada chega para quem jogou e para o grupo; abrir marca como lida', async () => {
    asUser(ana);
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
    const groupId = created.body!.group.id as string;
    for (const u of [bia, caio]) {
      asUser(u);
      await call(join.POST, {
        method: 'POST',
        body: { inviteCode: created.body!.group.inviteCode },
      });
    }
    asUser(ana);
    const event = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Noite', startsAt: new Date().toISOString() },
    });
    const eventId = event.body!.event.id as string;
    await call(games.POST, {
      method: 'POST',
      params: { eventId },
      body: {
        players: [
          { userId: ana.id, result: 'win' },
          { userId: bia.id, result: 'loss' },
        ],
      },
    });
    await flushBackground();

    asUser(bia);
    const forBia = await call(inbox.GET);
    // A partida e a conquista que ela desbloqueou ("Estreia").
    expect(forBia.body!.unread).toBe(2);
    const kinds = (forBia.body!.items as { kind: string }[]).map((i) => i.kind).sort();
    expect(kinds).toEqual(['achievement', 'game']);
    expect((forBia.body!.items as { kind: string }[]).find((i) => i.kind === 'game')).toMatchObject(
      {
        kind: 'game',
        eventTitle: 'Noite',
        data: { result: 'loss', winnerIds: [ana.id] },
        people: { [ana.id]: 'Ana' },
      },
    );
    // Uma a uma: só a escolhida; a de outra pessoa não existe (404).
    const gameItem = (forBia.body!.items as { id: string; kind: string }[]).find(
      (i) => i.kind === 'game',
    )!;
    const one = await call(readOne.POST, {
      method: 'POST',
      params: { notificationId: gameItem.id },
    });
    expect(one.status).toBe(204);
    expect((await call(inbox.GET)).body!.unread).toBe(1);
    asUser(caio);
    const other = await call(readOne.POST, {
      method: 'POST',
      params: { notificationId: gameItem.id },
    });
    expect(other.status).toBe(404);
    asUser(bia);
    // Todas de uma vez.
    expect((await call(read.POST, { method: 'POST' })).status).toBe(204);
    expect((await call(inbox.GET)).body!.unread).toBe(0);

    asUser(caio);
    expect((await call(inbox.GET)).body!.items).toEqual([
      expect.objectContaining({ kind: 'group_game' }),
    ]);
    // Ana registrou: só a conquista dela (estreia e primeira vitória), sem "partida registrada".
    asUser(ana);
    const forAna = (await call(inbox.GET)).body!.items as { kind: string }[];
    expect(forAna.map((i) => i.kind)).toEqual(['achievement', 'achievement']);
    // Primeira partida do grupo: o pódio só é guardado, sem aviso.
    expect(forAna.some((i) => i.kind === 'podium')).toBe(false);
  });
});
