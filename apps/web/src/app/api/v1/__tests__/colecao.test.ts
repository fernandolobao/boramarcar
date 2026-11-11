import { mapScryfallCard } from '@boramarcar/core';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const sol = mapScryfallCard({
  id: 'sol-c21',
  name: 'Sol Ring',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  set: 'c21',
  prices: { usd: '1.50', usd_foil: '4.00' },
});
const solLtc = { ...sol, scryfallId: 'sol-ltc', setCode: 'ltc' };
// Sem rede nos testes: o "Scryfall" responde estas cartas.
vi.mock('@/server/deck-import', () => ({
  resolveCardByName: async (_db: unknown, name: string) =>
    name.toLowerCase() === 'sol ring' ? sol : null,
  resolveCardById: async (_db: unknown, id: string) =>
    ({ 'sol-c21': sol, 'sol-ltc': solLtc })[id] ?? null,
}));

const collection = await import('../collection/route');
const entry = await import('../collection/[entryId]/route');

let close: () => Promise<void>;
type U = Awaited<ReturnType<typeof createTestUser>>;
let ana: U, bia: U;

beforeAll(async () => {
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
  [ana, bia] = await Promise.all([
    createTestUser(testDb.db, { name: 'Ana' }),
    createTestUser(testDb.db, { name: 'Bia' }),
  ]);
});
afterAll(() => close());

describe('API da coleção', () => {
  it('exige login', async () => {
    testState.user = null;
    expect((await call(collection.GET)).status).toBe(401);
  });

  it('adiciona, lista, muda impressão e foil, e só o dono mexe', async () => {
    asUser(ana);
    expect(
      (
        await call(collection.POST, {
          method: 'POST',
          body: { name: 'Carta Inventada', quantity: 1 },
        })
      ).status,
    ).toBe(404);
    const added = await call(collection.POST, {
      method: 'POST',
      body: { name: 'sol ring', quantity: 2 },
    });
    expect(added).toMatchObject({ status: 201, body: { name: 'Sol Ring' } });
    const list = (await call(collection.GET)).body!.cards;
    expect(list).toEqual([
      expect.objectContaining({ name: 'Sol Ring', quantity: 2, foil: false, decks: [] }),
    ]);
    const id = list[0].id as string;

    asUser(bia);
    const params = { entryId: id };
    expect(
      (await call(entry.PATCH, { method: 'PATCH', params, body: { quantity: 9 } })).status,
    ).toBe(404);
    expect((await call(entry.DELETE, { method: 'DELETE', params })).status).toBe(404);

    asUser(ana);
    expect((await call(entry.PATCH, { method: 'PATCH', params, body: {} })).status).toBe(400);
    await call(entry.PATCH, {
      method: 'PATCH',
      params,
      body: { scryfallId: 'sol-ltc', foil: true },
    });
    const [moved] = (await call(collection.GET)).body!.cards;
    expect(moved).toMatchObject({ scryfallId: 'sol-ltc', foil: true, quantity: 2 });
    expect(
      (await call(entry.DELETE, { method: 'DELETE', params: { entryId: moved.id } })).status,
    ).toBe(204);
    expect((await call(collection.GET)).body!.cards).toEqual([]);
  });
});
