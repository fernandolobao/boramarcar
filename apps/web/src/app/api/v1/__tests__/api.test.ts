import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

// Importados depois dos mocks.
const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const locations = await import('../groups/[groupId]/locations/route');
const availability = await import('../groups/[groupId]/availability/route');
const windows = await import('../groups/[groupId]/availability/windows/route');
const slot = await import('../availability/[slotId]/route');
const events = await import('../groups/[groupId]/events/route');
const eventDetail = await import('../events/[eventId]/route');
const rsvp = await import('../events/[eventId]/rsvp/route');
const games = await import('../events/[eventId]/games/route');
const ranking = await import('../groups/[groupId]/ranking/route');
const members = await import('../groups/[groupId]/members/route');
const activeGroup = await import('../me/active-group/route');

let close: () => Promise<void>;
type U = Awaited<ReturnType<typeof createTestUser>>;
let players: U[];

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  players = [];
  for (const name of ['Ana', 'Bia', 'Caio', 'Duda'])
    players.push(await createTestUser(testDb.db, { name }));
});
afterAll(() => close());
beforeEach(() => {
  testState.user = null;
});

const at = (time: string) => `2030-03-09T${time}:00-03:00`;

describe('API v1 — fluxo de grupo, disponibilidade, encontro, partidas e ranking', () => {
  it('exige autenticação', async () => {
    const res = await call(groups.GET);
    expect(res.status).toBe(401);
    expect(res.body?.error.code).toBe('unauthorized');
  });

  it('valida o corpo da requisição', async () => {
    asUser(players[0]!);
    expect((await call(groups.POST, { method: 'POST', body: { name: '' } })).status).toBe(400);
    const invalidJson = await call(groups.POST, { method: 'POST', body: '{nope' });
    expect(invalidJson.status).toBe(400);
    expect(invalidJson.body?.error.code).toBe('invalid_input');
  });

  it('executa o fluxo completo', async () => {
    const [ana, bia, caio, duda] = players as [U, U, U, U];

    asUser(ana);
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa de Sábado' } });
    expect(created.status).toBe(201);
    const groupId = created.body!.group.id as string;
    const inviteCode = created.body!.group.inviteCode as string;

    for (const user of [bia, caio, duda]) {
      asUser(user);
      expect((await call(join.POST, { method: 'POST', body: { inviteCode } })).status).toBe(200);
    }

    asUser(ana);
    const memberList = await call(members.GET, { params: { groupId } });
    expect(memberList.body!.members).toHaveLength(4);

    const loc = await call(locations.POST, {
      method: 'POST',
      params: { groupId },
      body: { name: 'Casa da Ana' },
    });
    expect(loc.status).toBe(201);
    const locationId = loc.body!.location.id as string;

    const ranges: [U, string, string][] = [
      [ana, '14:00', '22:00'],
      [bia, '15:00', '21:00'],
      [caio, '16:00', '23:00'],
      [duda, '13:00', '20:00'],
    ];
    for (const [user, start, end] of ranges) {
      asUser(user);
      const res = await call(availability.POST, {
        method: 'POST',
        params: { groupId },
        body: {
          startsAt: at(start),
          endsAt: at(end),
          locationIds: user === bia ? [locationId] : [],
        },
      });
      expect(res.status).toBe(201);
    }

    asUser(ana);
    const listed = await call(availability.GET, {
      params: { groupId },
      path: `/?from=${encodeURIComponent(at('00:00'))}&to=${encodeURIComponent(at('23:59'))}`,
    });
    expect(listed.body!.slots).toHaveLength(4);

    const suggested = await call(windows.GET, {
      params: { groupId },
      path: `/?from=${encodeURIComponent(at('00:00'))}&to=${encodeURIComponent(at('23:59'))}&minDurationMinutes=180`,
    });
    expect(suggested.status).toBe(200);
    const best = suggested.body!.windows[0];
    expect(best).toMatchObject({ locationId, locationName: 'Casa da Ana' });
    expect(new Date(best.start).toISOString()).toBe(new Date(at('16:00')).toISOString());
    expect(new Date(best.end).toISOString()).toBe(new Date(at('20:00')).toISOString());

    const event = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: {
        title: 'Commander',
        startsAt: best.start,
        endsAt: best.end,
        locationId,
        participantIds: best.userIds,
      },
    });
    expect(event.status).toBe(201);
    const eventId = event.body!.event.id as string;

    asUser(duda);
    expect(
      (await call(rsvp.PUT, { method: 'PUT', params: { eventId }, body: { rsvp: 'maybe' } })).body,
    ).toEqual({ rsvp: 'maybe' });
    expect(
      (await call(rsvp.PUT, { method: 'PUT', params: { eventId }, body: { rsvp: 'talvez' } }))
        .status,
    ).toBe(400);

    const game = await call(games.POST, {
      method: 'POST',
      params: { eventId },
      body: {
        players: [
          { userId: ana.id, result: 'loss' },
          { userId: bia.id, result: 'win' },
          { userId: caio.id, result: 'loss' },
          { userId: duda.id, result: 'loss' },
        ],
      },
    });
    expect(game.status).toBe(201);

    const twoWinners = await call(games.POST, {
      method: 'POST',
      params: { eventId },
      body: {
        players: [
          { userId: ana.id, result: 'win' },
          { userId: bia.id, result: 'win' },
        ],
      },
    });
    expect(twoWinners.status).toBe(400);

    const detail = await call(eventDetail.GET, { params: { eventId } });
    expect(detail.body!.event.games[0].winner.name).toBe('Bia');

    const table = await call(ranking.GET, { params: { groupId } });
    expect(table.body!.totalGames).toBe(1);
    expect(table.body!.standings[0]).toMatchObject({
      name: 'Bia',
      wins: 1,
      points: 3,
      position: 1,
    });

    // Somente o dono remove a própria disponibilidade
    const someSlot = listed.body!.slots.find((s: { userId: string }) => s.userId === ana.id);
    expect(
      (await call(slot.DELETE, { method: 'DELETE', params: { slotId: someSlot.id } })).status,
    ).toBe(403);
    asUser(ana);
    expect(
      (await call(slot.DELETE, { method: 'DELETE', params: { slotId: someSlot.id } })).status,
    ).toBe(204);

    // Grupo ativo via cookie
    const active = await call(activeGroup.PUT, { method: 'PUT', body: { groupId } });
    expect(active.status).toBe(200);
    expect(active.headers.get('set-cookie')).toContain(`bm_group=${groupId}`);
  });

  it('não deixa estranhos acessarem o grupo', async () => {
    const [ana] = players as [U];
    asUser(ana);
    const created = await call(groups.POST, { method: 'POST', body: { name: 'Fechado' } });
    const outsider = await createTestUser(testState.db!, { name: 'Estranho' });
    asUser(outsider);
    const res = await call(ranking.GET, { params: { groupId: created.body!.group.id } });
    expect(res.status).toBe(403);
    expect(
      (await call(activeGroup.PUT, { method: 'PUT', body: { groupId: created.body!.group.id } }))
        .status,
    ).toBe(403);
  });
});
