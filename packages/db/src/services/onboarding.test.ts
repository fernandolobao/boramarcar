import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, setRsvp } from './events';
import { getInvitePreview } from './groups';
import { getOnboardingChecklist, markOnboarding } from './onboarding';
import { deleteUserAccount, exportUserData } from './privacy';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

type P = { id: string; name: string };

describe('onboarding', () => {
  it('calcula os primeiros passos a partir dos dados e guarda só o "dispensar"', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [a] = players as unknown as [P, P];
    const before = await getOnboardingChecklist(db, { userId: a.id, groupId: group.id });
    expect(before.steps).toEqual([
      { key: 'availability', done: false },
      { key: 'invite', done: false },
      { key: 'rsvp', done: false },
      { key: 'deck', done: false },
    ]);
    expect(before).toMatchObject({ completed: 0, dismissed: false, members: 2 });

    const event = await createEvent(db, {
      groupId: group.id,
      userId: a.id,
      title: 'Commander',
      startsAt: new Date(Date.now() + 3 * 864e5),
    });
    await setRsvp(db, { eventId: event.id, userId: a.id, rsvp: 'maybe' });
    const after = await getOnboardingChecklist(db, { userId: a.id, groupId: group.id });
    expect(after.steps.find((s) => s.key === 'rsvp')!.done).toBe(true);

    await markOnboarding(db, { userId: a.id, flag: 'checklist-dismissed' });
    await markOnboarding(db, { userId: a.id, flag: 'checklist-dismissed' });
    expect((await getOnboardingChecklist(db, { userId: a.id, groupId: group.id })).dismissed).toBe(
      true,
    );

    const data = await exportUserData(db, a.id);
    expect(data.onboarding).toEqual([expect.objectContaining({ step: 'checklist-dismissed' })]);
    await deleteUserAccount(db, a.id);
  });

  it('convite mostra primeiros nomes e o próximo encontro, sem dados pessoais', async () => {
    const { group, players } = await seedGroup(db, 3);
    const [a] = players as unknown as [P, P, P];
    await createEvent(db, {
      groupId: group.id,
      userId: a.id,
      title: 'Sexta de Commander',
      startsAt: new Date(Date.now() + 2 * 864e5),
    });
    const preview = await getInvitePreview(db, group.inviteCode.toLowerCase());
    expect(preview).toMatchObject({ name: group.name, members: 3 });
    expect(preview!.firstNames).toHaveLength(3);
    expect(preview!.nextEvent).toMatchObject({ title: 'Sexta de Commander' });
    expect(JSON.stringify(preview)).not.toContain('@');
    expect(await getInvitePreview(db, 'NAOEXISTE')).toBeNull();
  });
});
