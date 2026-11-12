import { createEvent, createGroup, joinGroup } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { backgroundTasks, flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const eventRoute = await import('../events/[eventId]/route');
const gamesRoute = await import('../events/[eventId]/games/route');

let close: () => Promise<void>;
let sent: { to: string[]; subject: string; text: string }[] = [];

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.PUSH_NOTIFICATIONS = 'off';
  resetEnvCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return Response.json({ id: 'email' });
    }),
  );
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.PUSH_NOTIFICATIONS;
  resetEnvCache();
  await close();
});
beforeEach(() => {
  sent = [];
  backgroundTasks.splice(0);
});
afterEach(() => {
  testState.user = null;
});

describe('resumo da noite (8.6)', () => {
  it('sai uma vez, ao finalizar ou ao registrar partida num encontro já finalizado', async () => {
    const db = testState.db!;
    const ana = await createTestUser(db, { name: 'Ana Souza', email: 'ana@example.com' });
    const bia = await createTestUser(db, { name: 'Bia Lima', email: 'bia@example.com' });
    const caio = await createTestUser(db, { name: 'Caio', email: 'caio@example.com' });
    const group = await createGroup(db, { name: 'Mesa de Quinta', userId: ana.id });
    for (const u of [bia, caio])
      await joinGroup(db, { inviteCode: group.inviteCode, userId: u.id });
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Commander de sexta',
      startsAt: new Date(Date.now() - 3 * 3_600_000),
      participantIds: [bia.id, caio.id],
    });
    asUser(ana);
    const params = { eventId: event.id };

    // Finalizar sem partida: nada.
    await call(eventRoute.PATCH, { method: 'PATCH', body: { status: 'finished' }, params });
    await flushBackground();
    expect(sent).toHaveLength(0);

    // Partida registrada depois de finalizar: o resumo sai agora.
    const game = await call(gamesRoute.POST, {
      method: 'POST',
      params,
      body: {
        players: [
          { userId: ana.id, result: 'win' },
          { userId: bia.id, result: 'loss' },
          { userId: caio.id, result: 'loss' },
        ],
      },
    });
    expect(game.status).toBe(201);
    await flushBackground();
    expect(sent.map((m) => m.to[0]).sort()).toEqual([
      'ana@example.com',
      'bia@example.com',
      'caio@example.com',
    ]);
    expect(sent[0]!.subject).toBe('Como foi: Commander de sexta');
    expect(sent[0]!.text).toContain('Partida 1: Ana (-)');
    expect(sent[0]!.text).toContain(`/resumo/${event.id}`);

    // Reabrir e finalizar de novo não repete.
    sent = [];
    await call(eventRoute.PATCH, { method: 'PATCH', body: { status: 'scheduled' }, params });
    await call(eventRoute.PATCH, { method: 'PATCH', body: { status: 'finished' }, params });
    await flushBackground();
    expect(sent.filter((m) => m.subject.startsWith('Como foi'))).toHaveLength(0);
  });
});
