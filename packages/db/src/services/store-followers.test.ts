import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { storeMembers } from '../schema';
import { createTestDb, createTestUser } from '../testing';
import { listNotifications } from './inbox';
import { deleteUserAccount, exportUserData } from './privacy';
import { createStoreEvent } from './store-events';
import {
  followStore,
  getStoreFollowerCount,
  isFollowingStore,
  listStoreFollowerIds,
  listStoreNotices,
  postStoreNotice,
  unfollowStore,
} from './store-followers';
import { createStore } from './stores';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

async function setup() {
  const admin = await createTestUser(db);
  const dono = await createTestUser(db, { name: 'Dono' });
  const { store } = await createStore(db, {
    name: 'Loja do Mago',
    municipalityCode: '4314902',
    email: 'x@loja.test',
    createdBy: admin.id,
  });
  await db.insert(storeMembers).values({ storeId: store.id, userId: dono.id, role: 'owner' });
  return { store, dono };
}

describe('seguidores e avisos da loja (10.4)', () => {
  it('seguir e deixar de seguir (repetir não duplica); a equipe vê só quantas pessoas seguem', async () => {
    const { store, dono } = await setup();
    const ana = await createTestUser(db, { name: 'Ana' });
    const bia = await createTestUser(db, { name: 'Bia' });
    await followStore(db, { storeId: store.id, userId: ana.id });
    await followStore(db, { storeId: store.id, userId: ana.id });
    await followStore(db, { storeId: store.id, userId: bia.id });
    expect(await isFollowingStore(db, { storeId: store.id, userId: ana.id })).toBe(true);
    expect(await getStoreFollowerCount(db, { storeId: store.id, userId: dono.id })).toBe(2);
    // Quem é de fora não vê nem a contagem.
    await expect(
      getStoreFollowerCount(db, { storeId: store.id, userId: ana.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await unfollowStore(db, { storeId: store.id, userId: bia.id });
    expect(await isFollowingStore(db, { storeId: store.id, userId: bia.id })).toBe(false);
    await expect(followStore(db, { storeId: 'nao-existe', userId: ana.id })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('evento novo avisa quem segue no sino, com a loja, o evento e a data', async () => {
    const { store, dono } = await setup();
    const ana = await createTestUser(db);
    await followStore(db, { storeId: store.id, userId: ana.id });
    const startsAt = new Date(Date.now() + 5 * 86_400_000);
    const event = await createStoreEvent(db, {
      storeId: store.id,
      userId: dono.id,
      title: 'Commander de sexta',
      startsAt,
      format: 'commander',
      kind: 'casual',
    });
    expect(await listStoreFollowerIds(db, store.id)).toEqual([ana.id]);
    const [notice] = await listNotifications(db, { userId: ana.id });
    expect(notice).toMatchObject({
      kind: 'store_event',
      data: { storeEventId: event.id, event: 'new' },
      storeEvent: { title: 'Commander de sexta', slug: store.slug, storeName: 'Loja do Mago' },
    });
    expect(notice!.storeEvent!.startsAt).toEqual(startsAt);
    // A equipe não recebe o próprio aviso.
    expect(await listNotifications(db, { userId: dono.id })).toEqual([]);
  });

  it('aviso da equipe: até 280 caracteres, 3 por semana, vai para quem segue', async () => {
    const { store, dono } = await setup();
    const ana = await createTestUser(db);
    const estranho = await createTestUser(db);
    await followStore(db, { storeId: store.id, userId: ana.id });
    await expect(
      postStoreNotice(db, { storeId: store.id, userId: estranho.id, text: 'Oi' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      postStoreNotice(db, { storeId: store.id, userId: dono.id, text: 'x'.repeat(281) }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      postStoreNotice(db, { storeId: store.id, userId: dono.id, text: '   ' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    const now = new Date('2026-11-20T12:00:00Z');
    for (let i = 1; i <= 3; i++) {
      const result = await postStoreNotice(db, {
        storeId: store.id,
        userId: dono.id,
        text: `Chegou a coleção nova ${i}!`,
        now: new Date(now.getTime() + i * 60_000),
      });
      expect(result.followers).toEqual([ana.id]);
    }
    await expect(
      postStoreNotice(db, { storeId: store.id, userId: dono.id, text: 'Mais um', now }),
    ).rejects.toMatchObject({ code: 'rate_limited' });
    // Uma semana depois, pode de novo.
    await postStoreNotice(db, {
      storeId: store.id,
      userId: dono.id,
      text: 'Semana nova',
      now: new Date(now.getTime() + 8 * 86_400_000),
    });
    const notices = await listNotifications(db, { userId: ana.id });
    expect(notices[0]).toMatchObject({
      kind: 'store_notice',
      storeNotice: { text: 'Semana nova', storeName: 'Loja do Mago', slug: store.slug },
    });
    expect((await listStoreNotices(db, { storeId: store.id, userId: dono.id }))[0]).toMatchObject({
      text: 'Semana nova',
    });
  });

  it('LGPD: seguir sai na exportação e some com a conta', async () => {
    const { store } = await setup();
    const ana = await createTestUser(db);
    await followStore(db, { storeId: store.id, userId: ana.id });
    const data = await exportUserData(db, ana.id);
    expect(data.followedStores).toEqual([
      { name: 'Loja do Mago', slug: store.slug, since: expect.any(Date) },
    ]);
    await deleteUserAccount(db, ana.id);
    expect(await isFollowingStore(db, { storeId: store.id, userId: ana.id })).toBe(false);
  });
});
