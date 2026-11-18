import { getUserPreferences } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const locale = await import('../locale/route');

let close: () => Promise<void>;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(() => close());
afterEach(() => {
  testState.user = null;
});

describe('PUT /api/v1/locale', () => {
  it('sem login, só grava o cookie do idioma', async () => {
    const res = await call(locale.PUT, { method: 'PUT', body: { locale: 'en' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toMatch(/^NEXT_LOCALE=en;/);
  });

  it('com login, também salva no perfil', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana' });
    asUser(ana);
    const res = await call(locale.PUT, { method: 'PUT', body: { locale: 'en' } });
    expect(res.status).toBe(204);
    expect((await getUserPreferences(testState.db!, ana.id)).locale).toBe('en');
  });

  it('recusa idioma desconhecido', async () => {
    const res = await call(locale.PUT, { method: 'PUT', body: { locale: 'fr' } });
    expect(res.status).toBe(400);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
