import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import {
  addAvailability,
  deleteAvailability,
  listAvailability,
  suggestGameWindows,
} from './availability';
import { createGroup, createLocation } from './groups';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const at = (time: string) => new Date(`2026-11-14T${time}:00-03:00`);
const range = { from: at('00:00'), to: new Date('2026-11-15T03:00:00Z') };

describe('disponibilidade', () => {
  it('registra, lista e sugere janelas para a mesa', async () => {
    const { group, players, owner } = await seedGroup(db, 5);
    const casa = await createLocation(db, { groupId: group.id, userId: owner.id, name: 'Casa' });
    const loja = await createLocation(db, { groupId: group.id, userId: owner.id, name: 'Loja' });

    const [p1, p2, p3, p4, p5] = players;
    await addAvailability(db, {
      groupId: group.id,
      userId: p1!.id,
      startsAt: at('14:00'),
      endsAt: at('22:00'),
      locationIds: [casa.id],
    });
    await addAvailability(db, {
      groupId: group.id,
      userId: p2!.id,
      startsAt: at('15:00'),
      endsAt: at('21:00'),
    });
    await addAvailability(db, {
      groupId: group.id,
      userId: p3!.id,
      startsAt: at('16:00'),
      endsAt: at('23:00'),
    });
    await addAvailability(db, {
      groupId: group.id,
      userId: p4!.id,
      startsAt: at('13:00'),
      endsAt: at('20:00'),
      locationIds: [casa.id, loja.id],
    });
    await addAvailability(db, {
      groupId: group.id,
      userId: p5!.id,
      startsAt: at('18:00'),
      endsAt: at('19:00'),
      locationIds: [loja.id],
    });

    const slots = await listAvailability(db, { groupId: group.id, userId: p1!.id, ...range });
    expect(slots).toHaveLength(5);
    expect(slots[0]).toMatchObject({ userName: 'P4', locationIds: [casa.id, loja.id] });

    const windows = await suggestGameWindows(db, { groupId: group.id, userId: p1!.id, ...range });
    expect(windows[0]).toMatchObject({
      locationId: casa.id,
      locationName: 'Casa',
      start: at('16:00'),
      end: at('20:00'),
      userIds: [p1!.id, p2!.id, p3!.id, p4!.id].sort(),
    });
    expect(windows[0]?.players.map((p) => p.name).sort()).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('valida intervalo, locais e permissões', async () => {
    const { group, players } = await seedGroup(db, 2);
    const other = await createGroup(db, { name: 'Outro grupo', userId: players[0]!.id });
    const foreign = await createLocation(db, {
      groupId: other.id,
      userId: players[0]!.id,
      name: 'Fora',
    });
    const outsider = await createTestUser(db);

    await expect(
      addAvailability(db, {
        groupId: group.id,
        userId: players[0]!.id,
        startsAt: at('20:00'),
        endsAt: at('19:00'),
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      addAvailability(db, {
        groupId: group.id,
        userId: players[0]!.id,
        startsAt: at('18:00'),
        endsAt: at('19:00'),
        locationIds: [foreign.id],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      addAvailability(db, {
        groupId: group.id,
        userId: outsider.id,
        startsAt: at('18:00'),
        endsAt: at('19:00'),
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const slot = await addAvailability(db, {
      groupId: group.id,
      userId: players[0]!.id,
      startsAt: at('18:00'),
      endsAt: at('19:00'),
    });
    await expect(
      deleteAvailability(db, { slotId: slot.id, userId: players[1]!.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await deleteAvailability(db, { slotId: slot.id, userId: players[0]!.id });
    await expect(
      deleteAvailability(db, { slotId: slot.id, userId: players[0]!.id }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
