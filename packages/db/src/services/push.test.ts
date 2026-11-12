import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { listGroupRecipients } from './notifications';
import { deleteUserAccount, exportUserData } from './privacy';
import { forgetPushTokens, listPushTargets, registerPushToken, removePushToken } from './push';
import { updateUserPreferences } from './users';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

type P = { id: string; name: string };

describe('push', () => {
  it('registra, passa o aparelho para quem entrou, desliga e esquece tokens', async () => {
    const { players } = await seedGroup(db, 2);
    const [a, b] = players as unknown as [P, P];
    await updateUserPreferences(db, { userId: a.id, locale: 'en', timeZone: 'Europe/Lisbon' });
    await registerPushToken(db, { userId: a.id, token: 'ExponentPushToken[a]', platform: 'ios' });
    await registerPushToken(db, { userId: a.id, token: 'ExponentPushToken[a]', platform: 'ios' });
    expect(await listPushTargets(db, [a.id])).toEqual([
      { userId: a.id, token: 'ExponentPushToken[a]', locale: 'en', timeZone: 'Europe/Lisbon' },
    ]);

    // Outra pessoa entra no mesmo celular: o token passa para ela.
    await registerPushToken(db, { userId: b.id, token: 'ExponentPushToken[a]', platform: 'ios' });
    expect(await listPushTargets(db, [a.id])).toEqual([]);
    expect((await listPushTargets(db, [b.id])).map((t) => t.userId)).toEqual([b.id]);

    // Só o dono apaga o token.
    await removePushToken(db, { userId: a.id, token: 'ExponentPushToken[a]' });
    expect(await listPushTargets(db, [b.id])).toHaveLength(1);
    await removePushToken(db, { userId: b.id, token: 'ExponentPushToken[a]' });
    expect(await listPushTargets(db, [b.id])).toEqual([]);

    await registerPushToken(db, {
      userId: b.id,
      token: 'ExponentPushToken[b]',
      platform: 'android',
    });
    await forgetPushTokens(db, ['ExponentPushToken[b]']);
    expect(await listPushTargets(db, [b.id])).toEqual([]);
    expect(await listPushTargets(db, [])).toEqual([]);
  });

  it('push não depende do opt-out de e-mail; exportação e exclusão de conta', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [a, b] = players as unknown as [P, P];
    await updateUserPreferences(db, { userId: b.id, emailNotifications: false });
    const push = await listGroupRecipients(db, { groupId: group.id, channel: 'push' });
    const email = await listGroupRecipients(db, { groupId: group.id });
    expect(push.map((r) => r.userId).sort()).toEqual([a.id, b.id].sort());
    expect(email.map((r) => r.userId)).toEqual([a.id]);

    await registerPushToken(db, { userId: a.id, token: 'ExponentPushToken[x]', platform: 'ios' });
    const data = await exportUserData(db, a.id);
    expect(data.pushDevices).toEqual([expect.objectContaining({ platform: 'ios' })]);
    expect(JSON.stringify(data)).not.toContain('ExponentPushToken');

    await deleteUserAccount(db, a.id);
    expect(await listPushTargets(db, [a.id])).toEqual([]);
  });
});
