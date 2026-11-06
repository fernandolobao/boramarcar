import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const settings = await import('../groups/[groupId]/settings/route');
const events = await import('../groups/[groupId]/events/route');
const games = await import('../events/[eventId]/games/route');
const game = await import('../games/[gameId]/route');
const ranking = await import('../groups/[groupId]/ranking/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let ana: U, bia: U, caio: U, dani: U;
let groupId: string;
let eventId: string;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia, caio, dani] = (await Promise.all(
    ['Ana', 'Bia', 'Caio', 'Dani'].map((name) => createTestUser(testDb.db, { name })),
  )) as [U, U, U, U];
  asUser(ana);
  const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
  groupId = created.body!.group.id;
  for (const u of [bia, caio, dani]) {
    asUser(u);
    await call(join.POST, { method: 'POST', body: { inviteCode: created.body!.group.inviteCode } });
  }
  asUser(ana);
  const event = await call(events.POST, {
    method: 'POST',
    params: { groupId },
    body: { title: 'Noite', startsAt: new Date().toISOString() },
  });
  eventId = event.body!.event.id;
});
afterAll(() => close());
beforeEach(() => {
  testState.user = null;
});

describe('configurações do grupo (API)', () => {
  it('membros leem; só dono/admin altera; valida os pontos', async () => {
    asUser(bia);
    expect((await call(settings.GET, { params: { groupId } })).body!.settings).toMatchObject({
      tableSize: 4,
      defaultFormat: 'commander',
    });
    expect(
      (await call(settings.PATCH, { method: 'PATCH', params: { groupId }, body: { tableSize: 3 } }))
        .status,
    ).toBe(403);

    asUser(ana);
    const bad = await call(settings.PATCH, {
      method: 'PATCH',
      params: { groupId },
      body: { pointsWin: 1, pointsDraw: 1 },
    });
    expect(bad.status).toBe(400);
    expect(
      (await call(settings.PATCH, { method: 'PATCH', params: { groupId }, body: { extra: 1 } }))
        .status,
    ).toBe(400);
    const ok = await call(settings.PATCH, {
      method: 'PATCH',
      params: { groupId },
      body: { pointsWin: 4, defaultFormat: 'two_headed_giant' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body!.settings).toMatchObject({ pointsWin: 4, defaultFormat: 'two_headed_giant' });
  });
});

describe('partidas por tipo de jogo (API)', () => {
  it('registra no formato padrão do grupo, edita com PUT e filtra o ranking por formato', async () => {
    asUser(bia);
    const teams = (winner: number) =>
      [ana, bia, caio, dani].map((u, i) => ({
        userId: u.id,
        team: (i % 2) + 1,
        result: (i % 2) + 1 === winner ? 'win' : 'loss',
      }));
    const created = await call(games.POST, {
      method: 'POST',
      params: { eventId },
      body: { players: teams(1), winningTurn: 7 },
    });
    expect(created.status).toBe(201);
    expect(created.body!.game).toMatchObject({ format: 'two_headed_giant', winningTurn: 7 });
    const gameId = created.body!.game.id as string;

    expect(
      (
        await call(games.POST, {
          method: 'POST',
          params: { eventId },
          body: { format: 'commander', players: teams(1) },
        })
      ).status,
    ).toBe(400); // commander não tem times

    asUser(caio);
    expect(
      (await call(game.PUT, { method: 'PUT', params: { gameId }, body: { players: teams(2) } }))
        .status,
    ).toBe(403);
    asUser(bia);
    const edited = await call(game.PUT, {
      method: 'PUT',
      params: { gameId },
      body: { players: teams(2), durationMinutes: 50 },
    });
    expect(edited.status).toBe(200);
    expect(edited.body!.game).toMatchObject({ durationMinutes: 50, winningTurn: null });

    await call(games.POST, {
      method: 'POST',
      params: { eventId },
      body: {
        format: 'standard',
        players: [
          { userId: ana.id, result: 'win' },
          { userId: caio.id, result: 'loss' },
        ],
      },
    });

    const all = await call(ranking.GET, { params: { groupId } });
    expect(all.body!.totalGames).toBe(2);
    expect(all.body!.points).toEqual({ win: 4, draw: 1, loss: 0 });
    const thg = await call(ranking.GET, {
      path: '/?format=two_headed_giant',
      params: { groupId },
    });
    expect(thg.body!.totalGames).toBe(1);
    expect(
      thg
        .body!.standings.filter((s: { wins: number }) => s.wins === 1)
        .map((s: { name: string }) => s.name)
        .sort(),
    ).toEqual(['Bia', 'Dani']);
    expect((await call(ranking.GET, { path: '/?format=xyz', params: { groupId } })).status).toBe(
      400,
    );
  });
});
