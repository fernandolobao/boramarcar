import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const list = await import('../admin/announcements/route');
const one = await import('../admin/announcements/[announcementId]/route');
const publish = await import('../admin/announcements/[announcementId]/publish/route');
const inbox = await import('../me/notifications/route');

let close: () => Promise<void>;
beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
  delete process.env.ADMIN_EMAILS;
});

describe('avisos do ArcanaKin (API de admin)', () => {
  it('admin escreve, edita e publica; todo mundo recebe na central', async () => {
    const admin = await createTestUser(testState.db!, { name: 'Admin' });
    const bia = await createTestUser(testState.db!, { name: 'Bia' });
    process.env.ADMIN_EMAILS = admin.email;
    asUser(admin);

    const empty = await call(list.POST, {
      method: 'POST',
      body: { title: '  ', body: 'x', groupId: null },
    });
    expect(empty.status).toBe(400);
    const created = await call(list.POST, {
      method: 'POST',
      body: { title: 'Novidade', body: 'Texto', groupId: null },
    });
    expect(created.status).toBe(201);
    const id = created.body!.announcement.id as string;
    await call(one.PATCH, {
      method: 'PATCH',
      params: { announcementId: id },
      body: { body: 'Texto final' },
    });
    const done = await call(publish.POST, { method: 'POST', params: { announcementId: id } });
    expect(done.body).toMatchObject({ published: true, recipients: 2 });
    const again = await call(publish.POST, { method: 'POST', params: { announcementId: id } });
    expect(again.status).toBe(409);
    expect((await call(list.GET)).body!.announcements[0]).toMatchObject({
      status: 'published',
      title: 'Novidade',
    });

    asUser(bia);
    expect((await call(inbox.GET)).body!.items[0]).toMatchObject({
      kind: 'announcement',
      announcement: { title: 'Novidade', body: 'Texto final' },
    });
  });
});
