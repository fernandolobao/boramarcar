import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, setRsvp, updateEvent } from './events';
import { createLocation } from './groups';
import {
  claimEventReminder,
  claimWindowNotification,
  getEventForNotification,
  listEventsNeedingReminder,
  listGroupRecipients,
} from './notifications';
import { updateUserPreferences } from './users';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('notificações', () => {
  it('escolhe destinatários respeitando o opt-out, o RSVP e quem fez a ação', async () => {
    const { group, players } = await seedGroup(db, 4);
    type P = NonNullable<(typeof players)[number]>;
    const [p1, p2, p3, p4] = players as [P, P, P, P];
    await updateUserPreferences(db, { userId: p4.id, emailNotifications: false });
    await updateUserPreferences(db, { userId: p2.id, timeZone: 'Europe/Lisbon', locale: 'en' });

    expect(
      (await listGroupRecipients(db, { groupId: group.id, excludeUserId: p1.id })).map(
        (r) => r.name,
      ),
    ).toEqual(['P2', 'P3']);
    expect(await listGroupRecipients(db, { groupId: group.id, onlyUserIds: [] })).toEqual([]);

    const location = await createLocation(db, {
      groupId: group.id,
      userId: p1.id,
      name: 'Casa',
      address: 'Rua 1',
    });
    const event = await createEvent(db, {
      groupId: group.id,
      userId: p1.id,
      title: 'Commander',
      startsAt: new Date('2030-05-01T22:00:00Z'),
      locationId: location.id,
      participantIds: [p2.id, p3.id, p4.id],
    });

    const forGroup = await getEventForNotification(db, {
      eventId: event.id,
      audience: 'group',
      excludeUserId: p1.id,
    });
    expect(forGroup).toMatchObject({
      groupName: 'Mesa de Quinta',
      location: { name: 'Casa', address: 'Rua 1' },
    });
    expect(forGroup!.recipients).toEqual([
      expect.objectContaining({ name: 'P2', locale: 'en', timeZone: 'Europe/Lisbon' }),
      expect.objectContaining({ name: 'P3', locale: null, timeZone: 'America/Sao_Paulo' }),
    ]);

    await setRsvp(db, { eventId: event.id, userId: p3.id, rsvp: 'no' });
    const forParticipants = await getEventForNotification(db, {
      eventId: event.id,
      audience: 'participants',
      excludeUserId: p2.id,
    });
    expect(forParticipants!.recipients.map((r) => r.name)).toEqual(['P1']);
    expect(forParticipants!.confirmed).toEqual(['P1', 'P2', 'P4']);
    expect(await getEventForNotification(db, { eventId: 'nope', audience: 'group' })).toBeNull();
  });

  it('lembrete: lista, marca uma única vez e volta a valer se remarcar', async () => {
    const { group, owner } = await seedGroup(db, 1);
    const start = new Date('2030-06-10T22:00:00Z');
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Lembrete',
      startsAt: start,
    });
    const window = { from: new Date('2030-06-10T00:00:00Z'), to: new Date('2030-06-11T00:00:00Z') };

    expect((await listEventsNeedingReminder(db, window)).map((e) => e.id)).toContain(event.id);
    expect(await claimEventReminder(db, event.id)).toBe(true);
    expect(await claimEventReminder(db, event.id)).toBe(false);
    expect((await listEventsNeedingReminder(db, window)).map((e) => e.id)).not.toContain(event.id);

    await updateEvent(db, {
      eventId: event.id,
      userId: owner.id,
      startsAt: new Date('2030-06-10T23:00:00Z'),
    });
    expect((await listEventsNeedingReminder(db, window)).map((e) => e.id)).toContain(event.id);

    await updateEvent(db, { eventId: event.id, userId: owner.id, status: 'cancelled' });
    expect((await listEventsNeedingReminder(db, window)).map((e) => e.id)).not.toContain(event.id);
  });

  it('janela "a mesa fechou!" é avisada uma vez', async () => {
    const { group } = await seedGroup(db, 1);
    expect(await claimWindowNotification(db, { groupId: group.id, key: '2030-06-10|casa' })).toBe(
      true,
    );
    expect(await claimWindowNotification(db, { groupId: group.id, key: '2030-06-10|casa' })).toBe(
      false,
    );
    expect(await claimWindowNotification(db, { groupId: group.id, key: '2030-06-11|casa' })).toBe(
      true,
    );
  });
});
