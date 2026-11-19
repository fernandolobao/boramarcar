import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { stores } from '@boramarcar/db/schema';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const follow = await import('../stores/[storeId]/follow/route');
const bySlug = await import('../stores/by-slug/[slug]/route');

let close: () => Promise<void>;
let storeId: string;
let ana: Awaited<ReturnType<typeof createTestUser>>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  const owner = await createTestUser(testDb.db);
  ana = await createTestUser(testDb.db, { name: 'Ana' });
  const [store] = await testDb.db
    .insert(stores)
    .values({
      slug: 'loja-seguida',
      name: 'Loja Seguida',
      city: 'Curitiba',
      contactEmail: 's@x.test',
      createdBy: owner.id,
    })
    .returning();
  storeId = store!.id;
});
afterAll(() => close());

describe('seguir loja pela API (10.4)', () => {
  it('sem login não segue; com login segue, aparece no perfil da loja e deixa de seguir', async () => {
    testState.user = null;
    expect((await call(follow.PUT, { method: 'PUT', params: { storeId } })).status).toBe(401);
    asUser(ana);
    expect((await call(follow.PUT, { method: 'PUT', params: { storeId } })).status).toBe(200);
    expect((await call(bySlug.GET, { params: { slug: 'loja-seguida' } })).body!.following).toBe(
      true,
    );
    expect((await call(follow.DELETE, { method: 'DELETE', params: { storeId } })).status).toBe(200);
    expect((await call(bySlug.GET, { params: { slug: 'loja-seguida' } })).body!.following).toBe(
      false,
    );
    expect(
      (await call(follow.PUT, { method: 'PUT', params: { storeId: 'nao-existe' } })).status,
    ).toBe(404);
  });
});
