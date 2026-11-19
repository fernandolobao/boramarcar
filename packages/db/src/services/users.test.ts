import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame } from './events';
import {
  getUserImage,
  getUserPreferences,
  getUserSummary,
  setUserImage,
  updateUserImage,
  updateUserPreferences,
} from './users';

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
      city: null,
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

  it('resume partidas, vitórias, decks e grupos do usuário', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [a, b] = [players[0]!, players[1]!];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: a.id,
      title: 'X',
      startsAt: new Date(),
    });
    for (const winner of [a.id, a.id, b.id]) {
      await recordGame(db, {
        eventId: event.id,
        userId: a.id,
        players: [
          { userId: a.id, result: winner === a.id ? 'win' : 'loss' },
          { userId: b.id, result: winner === b.id ? 'win' : 'loss' },
        ],
      });
    }
    expect(await getUserSummary(db, a.id)).toMatchObject({
      games: 3,
      wins: 2,
      decks: 0,
      groups: [{ id: group.id, name: 'Mesa de Quinta', role: 'owner' }],
    });
    expect((await getUserSummary(db, a.id)).winRate).toBeCloseTo(2 / 3);
    await expect(getUserSummary(db, 'nope')).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('foto do perfil enviada', () => {
  it('troca e tira a foto, devolvendo a anterior; o login do Google não passa por cima da enviada', async () => {
    const ana = await createTestUser(db, { name: 'Ana' });
    await updateUserImage(db, { userId: ana.id, image: 'https://lh3.googleusercontent.com/a/1' });
    const mine = 'https://x.public.blob.vercel-storage.com/avatars/ana.webp';
    expect(await setUserImage(db, { userId: ana.id, image: mine })).toBe(
      'https://lh3.googleusercontent.com/a/1',
    );
    // Próximo login com o Google: a foto enviada fica.
    expect(
      await updateUserImage(db, { userId: ana.id, image: 'https://lh3.googleusercontent.com/a/2' }),
    ).toBe(false);
    expect(await getUserImage(db, ana.id)).toBe(mine);
    // Tirar a foto: volta às iniciais (e o próximo login do Google pode trazer a do Google).
    expect(await setUserImage(db, { userId: ana.id, image: null })).toBe(mine);
    expect(await getUserImage(db, ana.id)).toBeNull();
  });
});

describe('cidade do perfil (10.3)', () => {
  it('guarda, mostra com nome e UF, troca e tira; cidade inexistente é recusada', async () => {
    const ana = await createTestUser(db);
    expect((await getUserPreferences(db, ana.id)).city).toBeNull();
    await updateUserPreferences(db, { userId: ana.id, municipalityCode: '4106902' });
    expect((await getUserPreferences(db, ana.id)).city).toEqual({
      code: '4106902',
      name: 'Curitiba',
      uf: 'PR',
      slug: 'curitiba',
    });
    await expect(
      updateUserPreferences(db, { userId: ana.id, municipalityCode: '9999999' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await updateUserPreferences(db, { userId: ana.id, municipalityCode: null });
    expect((await getUserPreferences(db, ana.id)).city).toBeNull();
  });
});
