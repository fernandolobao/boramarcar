import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { getUserPreferences, updateUserPreferences } from './users';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('preferências do usuário', () => {
  it('usa o fuso padrão até o usuário escolher um', async () => {
    const user = await createTestUser(db);
    expect(await getUserPreferences(db, user.id)).toEqual({
      timeZone: 'America/Sao_Paulo',
      timeZoneIsDefault: true,
      locale: null,
      emailNotifications: true,
    });
    await updateUserPreferences(db, { userId: user.id, timeZone: 'Europe/Lisbon' });
    expect(await getUserPreferences(db, user.id)).toMatchObject({
      timeZone: 'Europe/Lisbon',
      timeZoneIsDefault: false,
    });
    await updateUserPreferences(db, { userId: user.id, locale: 'en', emailNotifications: false });
    expect(await getUserPreferences(db, user.id)).toMatchObject({
      timeZone: 'Europe/Lisbon',
      locale: 'en',
      emailNotifications: false,
    });
    await expect(updateUserPreferences(db, { userId: user.id })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });

  it('valida o fuso e o usuário', async () => {
    const user = await createTestUser(db);
    await expect(
      updateUserPreferences(db, { userId: user.id, timeZone: 'Lua/Base' }),
    ).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(
      updateUserPreferences(db, { userId: 'nope', timeZone: 'UTC' }),
    ).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(getUserPreferences(db, 'nope')).rejects.toMatchObject({ code: 'not_found' });
  });
});
