import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { addAvailability, listAvailability, suggestGameWindows } from './availability';
import { createLocation } from './groups';
import {
  addAvailabilityRule,
  deleteAvailabilityRule,
  listAvailabilityRules,
  setAvailabilityRange,
  setRuleException,
} from './recurring';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

// Novembro/2026 — quintas: 5, 12, 19, 26 (UTC-3)
const from = new Date('2026-11-01T03:00:00Z');
const to = new Date('2026-12-01T03:00:00Z');
const TZ = 'America/Sao_Paulo';

describe('disponibilidade recorrente', () => {
  it('regras semanais entram na lista e nas sugestões, com exceções', async () => {
    const { group, players } = await seedGroup(db, 4);
    for (const p of players) {
      await addAvailabilityRule(db, {
        groupId: group.id,
        userId: p.id,
        weekday: 4,
        startTime: '19:00',
        endTime: '23:00',
        timeZone: TZ,
      });
    }
    const rules = await listAvailabilityRules(db, { groupId: group.id, userId: players[0]!.id });
    expect(rules).toHaveLength(4);
    expect(rules[0]).toMatchObject({
      weekday: 4,
      startTime: '19:00',
      exceptions: [],
      locationIds: [],
    });

    const slots = await listAvailability(db, {
      groupId: group.id,
      userId: players[0]!.id,
      from,
      to,
    });
    expect(slots.filter((s) => s.kind === 'weekly')).toHaveLength(16);
    expect(slots[0]).toMatchObject({
      kind: 'weekly',
      date: '2026-11-05',
      startsAt: new Date('2026-11-05T22:00:00Z'),
    });

    let windows = await suggestGameWindows(db, {
      groupId: group.id,
      userId: players[0]!.id,
      from,
      to,
    });
    expect(windows).toHaveLength(4);

    // Uma pessoa não pode no dia 12: a mesa não fecha nessa quinta
    const bia = rules.find((r) => r.userId === players[1]!.id)!;
    await setRuleException(db, {
      ruleId: bia.id,
      userId: players[1]!.id,
      date: '2026-11-12',
      skip: true,
    });
    await setRuleException(db, {
      ruleId: bia.id,
      userId: players[1]!.id,
      date: '2026-11-12',
      skip: true,
    }); // idempotente
    windows = await suggestGameWindows(db, { groupId: group.id, userId: players[0]!.id, from, to });
    expect(windows.map((w) => w.start.toISOString().slice(0, 10))).toEqual([
      '2026-11-05',
      '2026-11-19',
      '2026-11-26',
    ]);

    await setRuleException(db, {
      ruleId: bia.id,
      userId: players[1]!.id,
      date: '2026-11-12',
      skip: false,
    });
    windows = await suggestGameWindows(db, { groupId: group.id, userId: players[0]!.id, from, to });
    expect(windows).toHaveLength(4);
  });

  it('valida permissões, dados e locais', async () => {
    const { group, players, owner } = await seedGroup(db, 2);
    const outsider = await createTestUser(db);
    const local = await createLocation(db, { groupId: group.id, userId: owner.id, name: 'Loja' });
    const base = {
      groupId: group.id,
      userId: owner.id,
      weekday: 5,
      startTime: '20:00',
      endTime: '01:00',
      timeZone: TZ,
    };

    const rule = await addAvailabilityRule(db, {
      ...base,
      locationIds: [local.id],
      note: ' Até tarde ',
    });
    expect(rule).toMatchObject({ note: 'Até tarde', locationIds: [local.id] });

    await expect(addAvailabilityRule(db, { ...base, userId: outsider.id })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(addAvailabilityRule(db, { ...base, weekday: 9 })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(addAvailabilityRule(db, { ...base, locationIds: ['x'] })).rejects.toMatchObject({
      code: 'invalid_input',
    });

    await expect(
      setRuleException(db, {
        ruleId: rule.id,
        userId: players[1]!.id,
        date: '2026-11-13',
        skip: true,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      setRuleException(db, { ruleId: rule.id, userId: owner.id, date: '2026-11-12', skip: true }),
    ).rejects.toMatchObject({ code: 'invalid_input' }); // é quinta
    await expect(
      setRuleException(db, { ruleId: rule.id, userId: owner.id, date: '13/11', skip: true }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    await expect(
      deleteAvailabilityRule(db, { ruleId: rule.id, userId: players[1]!.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await deleteAvailabilityRule(db, { ruleId: rule.id, userId: owner.id });
    await expect(
      deleteAvailabilityRule(db, { ruleId: rule.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('grade: marcar e desmarcar horários', () => {
  const h = (hour: number) => new Date(Date.UTC(2026, 10, 14, hour + 3)); // 14/11 em UTC-3

  it('une horários vizinhos e recorta ao desmarcar', async () => {
    const { group, owner } = await seedGroup(db, 1);
    const mine = async () =>
      (await listAvailability(db, { groupId: group.id, userId: owner.id, from: h(0), to: h(23) }))
        .filter((s) => s.kind === 'once')
        .map((s) => [
          (s.startsAt.getTime() - h(0).getTime()) / 3_600_000,
          (s.endsAt.getTime() - h(0).getTime()) / 3_600_000,
        ]);

    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(19),
      end: h(20),
      available: true,
    });
    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(20),
      end: h(21),
      available: true,
    });
    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(18),
      end: h(19),
      available: true,
    });
    expect(await mine()).toEqual([[18, 21]]);

    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(19),
      end: h(20),
      available: false,
    });
    expect(await mine()).toEqual([
      [18, 19],
      [20, 21],
    ]);

    // Não une com intervalos que têm local ou observação (preserva os dados)
    await addAvailability(db, {
      groupId: group.id,
      userId: owner.id,
      startsAt: h(10),
      endsAt: h(12),
      note: 'Na loja',
    });
    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(12),
      end: h(13),
      available: true,
    });
    expect(await mine()).toEqual([
      [10, 12],
      [12, 13],
      [18, 19],
      [20, 21],
    ]);
    // Recortar mantém a observação
    await setAvailabilityRange(db, {
      groupId: group.id,
      userId: owner.id,
      start: h(10),
      end: h(11),
      available: false,
    });
    const slots = await listAvailability(db, {
      groupId: group.id,
      userId: owner.id,
      from: h(0),
      to: h(23),
    });
    expect(slots[0]).toMatchObject({ note: 'Na loja', startsAt: h(11), endsAt: h(12) });
  });
});
