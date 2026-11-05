import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const groups = await import('../groups/route');
const join = await import('../groups/join/route');
const rules = await import('../groups/[groupId]/availability-rules/route');
const rule = await import('../availability-rules/[ruleId]/route');
const exceptions = await import('../availability-rules/[ruleId]/exceptions/route');
const availability = await import('../groups/[groupId]/availability/route');
const range = await import('../groups/[groupId]/availability/range/route');
const member = await import('../groups/[groupId]/members/[userId]/route');
const members = await import('../groups/[groupId]/members/route');
const transfer = await import('../groups/[groupId]/transfer/route');

type U = Awaited<ReturnType<typeof createTestUser>>;
let close: () => Promise<void>;
let ana: U;
let bia: U;
let caio: U;
let groupId: string;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia, caio] = (await Promise.all(
    ['Ana', 'Bia', 'Caio'].map((name) => createTestUser(testDb.db, { name })),
  )) as [U, U, U];
  asUser(ana);
  const created = await call(groups.POST, { method: 'POST', body: { name: 'Mesa' } });
  groupId = created.body!.group.id;
  for (const u of [bia, caio]) {
    asUser(u);
    await call(join.POST, { method: 'POST', body: { inviteCode: created.body!.group.inviteCode } });
  }
});
afterAll(() => close());
beforeEach(() => {
  testState.user = null;
});

const query = (from: string, to: string) =>
  `/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

describe('disponibilidade recorrente e grade', () => {
  it('cria regras para vários dias, pula uma data e remove', async () => {
    asUser(ana);
    const created = await call(rules.POST, {
      method: 'POST',
      params: { groupId },
      body: {
        weekdays: [4, 2, 4],
        startTime: '19:00',
        endTime: '23:00',
        timeZone: 'America/Sao_Paulo',
      },
    });
    expect(created.status).toBe(201);
    expect(created.body!.rules.map((r: { weekday: number }) => r.weekday)).toEqual([2, 4]);
    const thursday = created.body!.rules[1].id as string;

    expect(
      (
        await call(rules.POST, {
          method: 'POST',
          params: { groupId },
          body: { weekdays: [], startTime: '19:00', endTime: '23:00', timeZone: 'UTC' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(rules.POST, {
          method: 'POST',
          params: { groupId },
          body: { weekdays: [1], startTime: '7pm', endTime: '23:00', timeZone: 'UTC' },
        })
      ).status,
    ).toBe(400);

    const nov = query('2026-11-01T03:00:00Z', '2026-12-01T03:00:00Z');
    let list = await call(availability.GET, { params: { groupId }, path: nov });
    expect(list.body!.slots.filter((s: { kind: string }) => s.kind === 'weekly')).toHaveLength(8);

    expect(
      (
        await call(exceptions.PUT, {
          method: 'PUT',
          params: { ruleId: thursday },
          body: { date: '2026-11-12', skip: true },
        })
      ).status,
    ).toBe(200);
    list = await call(availability.GET, { params: { groupId }, path: nov });
    expect(list.body!.slots.some((s: { date: string }) => s.date === '2026-11-12')).toBe(false);

    asUser(bia);
    expect(
      (
        await call(exceptions.PUT, {
          method: 'PUT',
          params: { ruleId: thursday },
          body: { date: '2026-11-19', skip: true },
        })
      ).status,
    ).toBe(403);
    expect(
      (await call(rule.DELETE, { method: 'DELETE', params: { ruleId: thursday } })).status,
    ).toBe(403);

    asUser(ana);
    const listed = await call(rules.GET, { params: { groupId } });
    expect(listed.body!.rules.find((r: { id: string }) => r.id === thursday).exceptions).toEqual([
      '2026-11-12',
    ]);
    expect(
      (await call(rule.DELETE, { method: 'DELETE', params: { ruleId: thursday } })).status,
    ).toBe(204);
  });

  it('marca e desmarca horários pela grade', async () => {
    asUser(bia);
    const body = { start: '2030-01-10T22:00:00.000Z', end: '2030-01-10T23:00:00.000Z' };
    expect(
      (
        await call(range.PUT, {
          method: 'PUT',
          params: { groupId },
          body: { ...body, available: true },
        })
      ).status,
    ).toBe(200);
    const path = query('2030-01-10T00:00:00Z', '2030-01-11T00:00:00Z');
    let mine = (await call(availability.GET, { params: { groupId }, path })).body!.slots.filter(
      (s: { userId: string }) => s.userId === bia.id,
    );
    expect(mine).toHaveLength(1);
    await call(range.PUT, {
      method: 'PUT',
      params: { groupId },
      body: { ...body, available: false },
    });
    mine = (await call(availability.GET, { params: { groupId }, path })).body!.slots.filter(
      (s: { userId: string }) => s.userId === bia.id,
    );
    expect(mine).toHaveLength(0);
    expect(
      (
        await call(range.PUT, {
          method: 'PUT',
          params: { groupId },
          body: { ...body, end: body.start, available: true },
        })
      ).status,
    ).toBe(400);
  });
});

describe('gestão de membros', () => {
  it('promove, transfere, remove e sai', async () => {
    asUser(bia);
    expect(
      (
        await call(member.PATCH, {
          method: 'PATCH',
          params: { groupId, userId: caio.id },
          body: { role: 'admin' },
        })
      ).status,
    ).toBe(403);

    asUser(ana);
    expect(
      (
        await call(member.PATCH, {
          method: 'PATCH',
          params: { groupId, userId: bia.id },
          body: { role: 'admin' },
        })
      ).body,
    ).toEqual({ role: 'admin' });
    expect(
      (
        await call(member.PATCH, {
          method: 'PATCH',
          params: { groupId, userId: bia.id },
          body: { role: 'owner' },
        })
      ).status,
    ).toBe(400);

    // Dono não sai sem transferir
    const leave = await call(member.DELETE, {
      method: 'DELETE',
      params: { groupId, userId: ana.id },
    });
    expect(leave.status).toBe(409);

    expect(
      (await call(transfer.POST, { method: 'POST', params: { groupId }, body: { userId: bia.id } }))
        .status,
    ).toBe(200);
    asUser(bia);
    const roles = Object.fromEntries(
      (await call(members.GET, { params: { groupId } })).body!.members.map(
        (m: { name: string; role: string }) => [m.name, m.role],
      ),
    );
    expect(roles).toEqual({ Ana: 'admin', Bia: 'owner', Caio: 'member' });

    // Admin (Ana) remove membro comum (Caio)
    asUser(ana);
    expect(
      (await call(member.DELETE, { method: 'DELETE', params: { groupId, userId: caio.id } })).body,
    ).toEqual({ groupDeleted: false });
    // Ana sai do grupo
    expect(
      (await call(member.DELETE, { method: 'DELETE', params: { groupId, userId: ana.id } })).body,
    ).toEqual({ groupDeleted: false });
    expect((await call(members.GET, { params: { groupId } })).status).toBe(403);
  });
});
