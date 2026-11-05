import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const invite = await import('../groups/[groupId]/invite/route');
const events = await import('../groups/[groupId]/events/route');
const event = await import('../events/[eventId]/route');
const ics = await import('../events/[eventId]/ics/route');
const preferences = await import('../me/preferences/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let owner: U;
let friend: U;
let groupId: string;
let inviteCode: string;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  owner = await createTestUser(testDb.db, { name: 'Ana' });
  friend = await createTestUser(testDb.db, { name: 'Bia' });
  asUser(owner);
  const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
  groupId = created.body!.group.id;
  inviteCode = created.body!.group.inviteCode;
});
afterAll(() => close());
beforeEach(() => {
  testState.user = null;
});

describe('convites', () => {
  it('entrar por convite define o grupo ativo', async () => {
    asUser(friend);
    const res = await call(join.POST, {
      method: 'POST',
      body: { inviteCode: inviteCode.toLowerCase() },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(
      new RegExp(`bm_group=${groupId}; Path=/; Max-Age=\\d+; SameSite=Lax; HttpOnly`),
    );
  });

  it('só dono/admin gera novo convite', async () => {
    asUser(friend);
    expect((await call(invite.POST, { method: 'POST', params: { groupId } })).status).toBe(403);
    asUser(owner);
    const res = await call(invite.POST, { method: 'POST', params: { groupId } });
    expect(res.status).toBe(200);
    expect(res.body!.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(res.body!.inviteCode).not.toBe(inviteCode);
    // Código antigo deixa de funcionar
    const outsider = await createTestUser(testState.db!);
    asUser(outsider);
    expect((await call(join.POST, { method: 'POST', body: { inviteCode } })).status).toBe(404);
  });
});

describe('encontros: editar, status e .ics', () => {
  it('edita, cancela e exporta para a agenda', async () => {
    asUser(friend);
    const created = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Commander; sábado', startsAt: '2030-03-09T22:00:00.000Z' },
    });
    const eventId = created.body!.event.id as string;

    asUser(owner);
    const edited = await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: {
        title: 'Commander remarcado',
        startsAt: '2030-03-10T22:00:00.000Z',
        endsAt: '2030-03-11T02:00:00.000Z',
      },
    });
    expect(edited.status).toBe(200);
    expect(edited.body!.event).toMatchObject({ title: 'Commander remarcado', sequence: 1 });

    expect(
      (
        await call(event.PATCH, {
          method: 'PATCH',
          params: { eventId },
          body: { status: 'adiado' },
        })
      ).status,
    ).toBe(400);
    expect(
      (await call(event.PATCH, { method: 'PATCH', params: { eventId }, body: { groupId: 'x' } }))
        .status,
    ).toBe(400);

    const cancelled = await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId },
      body: { status: 'cancelled' },
    });
    expect(cancelled.body!.event.status).toBe('cancelled');

    const req = new Request('http://localhost/');
    const res = await ics.GET(req, { params: Promise.resolve({ eventId }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="commander-remarcado.ics"',
    );
    const body = await res.text();
    expect(body).toContain(`UID:${eventId}@boramarcar`);
    expect(body).toContain('DTSTART:20300310T220000Z');
    expect(body).toContain('DTEND:20300311T020000Z');
    expect(body).toContain('STATUS:CANCELLED');
    expect(body).toContain('SEQUENCE:2');
    expect(body).toContain(`/eventos/${eventId}`);
  });

  it('membro comum não edita encontro de outra pessoa', async () => {
    asUser(owner);
    const created = await call(events.POST, {
      method: 'POST',
      params: { groupId },
      body: { title: 'Do dono', startsAt: '2030-04-01T22:00:00.000Z' },
    });
    asUser(friend);
    const res = await call(event.PATCH, {
      method: 'PATCH',
      params: { eventId: created.body!.event.id },
      body: { status: 'cancelled' },
    });
    expect(res.status).toBe(403);
  });
});

describe('preferências', () => {
  it('salva fuso, idioma e avisos por e-mail e atualiza os cookies', async () => {
    asUser(friend);
    expect((await call(preferences.GET)).body!.preferences).toEqual({
      timeZone: 'America/Sao_Paulo',
      timeZoneIsDefault: true,
      locale: null,
      emailNotifications: true,
    });

    const res = await call(preferences.PUT, {
      method: 'PUT',
      body: { timeZone: 'Europe/Lisbon', locale: 'en' },
    });
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('bm_tz=Europe%2FLisbon;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('NEXT_LOCALE=en;'))).toBe(true);
    expect((await call(preferences.GET)).body!.preferences).toEqual({
      timeZone: 'Europe/Lisbon',
      timeZoneIsDefault: false,
      locale: 'en',
      emailNotifications: true,
    });

    const optOut = await call(preferences.PUT, {
      method: 'PUT',
      body: { emailNotifications: false },
    });
    expect(optOut.status).toBe(200);
    expect(optOut.headers.getSetCookie()).toEqual([]);
    expect((await call(preferences.GET)).body!.preferences).toMatchObject({
      timeZone: 'Europe/Lisbon',
      emailNotifications: false,
    });
  });

  it('valida a entrada', async () => {
    asUser(friend);
    expect(
      (await call(preferences.PUT, { method: 'PUT', body: { timeZone: 'Lua/Base' } })).status,
    ).toBe(400);
    expect((await call(preferences.PUT, { method: 'PUT', body: { locale: 'fr' } })).status).toBe(
      400,
    );
    expect((await call(preferences.PUT, { method: 'PUT', body: {} })).status).toBe(400);
  });
});
