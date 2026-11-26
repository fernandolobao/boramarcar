import { listActivity } from '@boramarcar/db';
import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { asUser, call, dbMock, sessionMock, testState } from '@/test/api';
import { flushBackground } from '@/test/setup';

vi.mock('@/server/session', () => sessionMock);
vi.mock('@/server/db', () => dbMock);

const decks = await import('../decks/route');
const deck = await import('../decks/[deckId]/route');
const groups = await import('../groups/route');

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

describe('registro de atividade pelas rotas (Admin)', () => {
  it('criar grupo e deck, editar duas vezes e apagar: linhas por alvo e hora, com o nome', async () => {
    const ana = await createTestUser(testState.db!, { name: 'Ana Rotas' });
    asUser(ana);
    await call(groups.POST, { method: 'POST', body: { name: 'Mesa das Rotas' } });
    const created = await call(decks.POST, {
      method: 'POST',
      body: { kind: 'empty', name: 'Elfos', format: 'commander' },
    });
    const deckId = created.body!.deck.id as string;
    await call(deck.PATCH, { method: 'PATCH', params: { deckId }, body: { name: 'Elfos Ramp' } });
    await call(deck.PATCH, { method: 'PATCH', params: { deckId }, body: { name: 'Elfos Ramp 2' } });
    await call(deck.DELETE, { method: 'DELETE', params: { deckId } });
    await flushBackground();

    const { items } = await listActivity(testState.db!, { since: new Date(0), userId: ana.id });
    const byKind = Object.fromEntries(items.map((i) => [i.kind, i]));
    expect(byKind.group_created).toMatchObject({ label: 'Mesa das Rotas', count: 1 });
    expect(byKind.deck_created).toMatchObject({ label: 'Elfos', count: 1 });
    // Duas edições na mesma hora: uma linha só, com o nome mais recente.
    expect(byKind.deck_updated).toMatchObject({ label: 'Elfos Ramp 2', count: 2 });
    // Apagar guarda o nome de antes de apagar.
    expect(byKind.deck_deleted).toMatchObject({ label: 'Elfos Ramp 2', count: 1 });
  });

  it('ação que falha não é registrada', async () => {
    const bia = await createTestUser(testState.db!, { name: 'Bia Rotas' });
    asUser(bia);
    const res = await call(deck.PATCH, {
      method: 'PATCH',
      params: { deckId: 'nao-existe' },
      body: { name: 'X' },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    await flushBackground();
    expect(
      (await listActivity(testState.db!, { since: new Date(0), userId: bia.id })).items,
    ).toEqual([]);
  });
});
