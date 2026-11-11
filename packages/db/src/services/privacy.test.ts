import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { account, decks, groupMembers, groups, locations, session, user } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { addAvailability } from './availability';
import { saveImportedDeck } from './decks';
import { createEvent, getEventDetail, recordGame } from './events';
import { createGroup, createLocation } from './groups';
import {
  accountDeletionPreview,
  DELETED_USER_NAME,
  deleteUserAccount,
  exportUserData,
} from './privacy';
import { getGroupRanking } from './ranking';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

async function seedPlayer() {
  const { group, players, owner } = await seedGroup(db, 3);
  const [a, b, c] = players.map((p) => p.id) as [string, string, string];
  await db.insert(account).values({
    id: `acc-${a}`,
    accountId: 'google-sub-123',
    providerId: 'google',
    userId: a,
    accessToken: 'segredo-access',
    refreshToken: 'segredo-refresh',
    idToken: 'segredo-id',
  });
  await db.insert(session).values({
    id: `s-${a}`,
    token: `tok-${a}`,
    userId: a,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  const home = await createLocation(db, {
    groupId: group.id,
    userId: a,
    name: 'Casa do A',
    address: 'Rua das Flores, 10',
    hostUserId: a,
  });
  const shop = await createLocation(db, { groupId: group.id, userId: a, name: 'Loja' });
  const deck = await saveImportedDeck(db, {
    ownerId: a,
    deck: {
      name: 'Deck do A',
      source: 'text',
      entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard', isProxy: true }],
    },
    cards: [],
  });
  const past = await createEvent(db, {
    groupId: group.id,
    userId: b,
    title: 'Encontro passado',
    startsAt: new Date('2026-01-10T22:00:00Z'),
    participantIds: [a, c],
  });
  await recordGame(db, {
    eventId: past.id,
    userId: b,
    players: [
      { userId: a, result: 'win', deckId: deck.id },
      { userId: b, result: 'loss' },
      { userId: c, result: 'loss' },
    ],
  });
  const future = await createEvent(db, {
    groupId: group.id,
    userId: b,
    title: 'Encontro futuro',
    startsAt: new Date('2099-01-10T22:00:00Z'),
    participantIds: [a, c],
  });
  await addAvailability(db, {
    groupId: group.id,
    userId: a,
    startsAt: new Date('2099-02-01T22:00:00Z'),
    endsAt: new Date('2099-02-02T02:00:00Z'),
  });
  return { group, owner, a, b, c, home, shop, deck, past, future };
}

describe('exportUserData', () => {
  it('traz os dados da pessoa, sem tokens nem dados de outras pessoas', async () => {
    const { a, b } = await seedPlayer();
    const data = await exportUserData(db, a);
    expect(data.profile).toMatchObject({ id: a, name: 'P1' });
    expect(data.logins).toEqual([expect.objectContaining({ provider: 'google' })]);
    expect(data.groups).toEqual([
      expect.objectContaining({ group: 'Mesa de Quinta', role: 'owner' }),
    ]);
    expect(data.hostedPlaces).toEqual([
      expect.objectContaining({ name: 'Casa do A', address: 'Rua das Flores, 10' }),
    ]);
    expect(data.availability.slots).toHaveLength(1);
    expect(data.events.map((e) => e.event)).toEqual(['Encontro passado', 'Encontro futuro']);
    expect(data.games).toEqual([expect.objectContaining({ result: 'win', deck: 'Deck do A' })]);
    expect(data.decks).toEqual([
      expect.objectContaining({
        name: 'Deck do A',
        cards: [expect.objectContaining({ name: 'Sol Ring', proxy: true })],
      }),
    ]);
    const text = JSON.stringify(data);
    expect(text).not.toContain('segredo');
    expect(text).not.toContain('google-sub-123');
    const [other] = await db.select().from(user).where(eq(user.id, b));
    expect(text).not.toContain(other!.email);
  });
});

describe('deleteUserAccount', () => {
  it('apaga os dados pessoais e mantém as partidas anônimas para o grupo', async () => {
    const { group, a, b, c, home, shop, deck, past, future } = await seedPlayer();
    expect(await accountDeletionPreview(db, a)).toEqual({
      transfers: ['Mesa de Quinta'],
      deletions: [],
    });

    const result = await deleteUserAccount(db, a, new Date('2026-11-11T12:00:00Z'));
    expect(result.transferredGroups).toEqual([group.id]);

    const [gone] = await db.select().from(user).where(eq(user.id, a));
    expect(gone).toMatchObject({
      name: DELETED_USER_NAME,
      image: null,
      emailNotifications: false,
    });
    expect(gone!.email).toMatch(/@arcanakin\.invalid$/);
    expect(gone!.deletedAt).toBeInstanceOf(Date);
    expect(await db.select().from(account).where(eq(account.userId, a))).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, a))).toEqual([]);
    expect(await db.select().from(decks).where(eq(decks.id, deck.id))).toEqual([]);
    expect(await db.select().from(locations).where(eq(locations.id, home.id))).toEqual([]);
    const [kept] = await db.select().from(locations).where(eq(locations.id, shop.id));
    expect(kept?.createdBy).toBeNull();

    // Posse do grupo passou para o membro mais antigo; a pessoa saiu do grupo.
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, group.id));
    expect(members.map((m) => m.userId).sort()).toEqual([b, c].sort());
    expect(members.find((m) => m.userId === b)?.role).toBe('owner');

    // A partida continua, com "Jogador removido" e sem o deck.
    const detail = await getEventDetail(db, { eventId: past.id, userId: b });
    const players = detail.games[0]!.players;
    expect(players).toContainEqual(
      expect.objectContaining({ userId: a, name: DELETED_USER_NAME, result: 'win' }),
    );
    // Presença no encontro futuro foi apagada; a do passado ficou.
    const upcoming = await getEventDetail(db, { eventId: future.id, userId: b });
    expect(upcoming.participants.map((p) => p.userId)).not.toContain(a);

    const ranking = await getGroupRanking(db, { groupId: group.id, userId: b });
    expect(JSON.stringify(ranking)).not.toContain('P1');

    await expect(deleteUserAccount(db, a)).rejects.toMatchObject({ code: 'not_found' });
    await expect(exportUserData(db, a)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('grupo só da pessoa é apagado', async () => {
    const solo = await createTestUser(db);
    const group = await createGroup(db, { name: 'Só eu', userId: solo.id });
    expect(await accountDeletionPreview(db, solo.id)).toEqual({
      transfers: [],
      deletions: ['Só eu'],
    });
    const result = await deleteUserAccount(db, solo.id);
    expect(result.deletedGroups).toEqual([group.id]);
    expect(await db.select().from(groups).where(eq(groups.id, group.id))).toEqual([]);
  });

  it('prefere um admin como novo dono', async () => {
    const { group, players, owner } = await seedGroup(db, 3);
    await db
      .update(groupMembers)
      .set({ role: 'admin' })
      .where(eq(groupMembers.userId, players[2]!.id));
    await deleteUserAccount(db, owner.id);
    const [heir] = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, players[2]!.id));
    expect(heir).toMatchObject({ groupId: group.id, role: 'owner' });
  });
});
