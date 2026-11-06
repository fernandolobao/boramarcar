import { createTestDb, createTestUser } from '@boramarcar/db/testing';
import { mapScryfallCard } from '@boramarcar/core';
import { saveImportedDeck, schema, upsertCards } from '@boramarcar/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/env';
import { dbMock, testState } from '@/test/api';

vi.mock('@/server/db', () => dbMock);

const cron = await import('../../cron/scryfall/route');

let close: () => Promise<void>;
beforeAll(async () => {
  process.env.CRON_SECRET = 'segredo-do-cron-123';
  resetEnvCache();
  const testDb = await createTestDb();
  testState.db = testDb.db;
  close = testDb.close;
});
afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.CRON_SECRET;
  resetEnvCache();
  await close();
});

const card = (id: string, name: string, usd: string) => ({
  id,
  name,
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  prices: { usd },
});

describe('cron do cache do Scryfall', () => {
  it('exige o segredo e atualiza só cartas de decks com cache velho', async () => {
    const db = testState.db!;
    const owner = await createTestUser(db, { name: 'Cache' });
    await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'Cache',
        source: 'text',
        entries: [
          { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol' },
          { name: 'Sumida', quantity: 1, board: 'mainboard', scryfallId: 'gone' },
        ],
      },
      cards: [
        mapScryfallCard(card('sol', 'Sol Ring', '1.00')),
        mapScryfallCard(card('gone', 'Sumida', '9.00')),
      ],
    });
    // Carta fora de qualquer deck: não entra na atualização.
    await upsertCards(db, [mapScryfallCard(card('loose', 'Solta', '3.00'))]);
    const old = new Date('2020-01-01T00:00:00Z');
    await db.update(schema.cards).set({ updatedAt: old });

    const requested: string[][] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const ids = (
          JSON.parse(String(init?.body)) as { identifiers: { id: string }[] }
        ).identifiers.map((i) => i.id);
        requested.push(ids);
        return Response.json({
          data: ids.includes('sol') ? [card('sol', 'Sol Ring', '2.50')] : [],
          not_found: ids.filter((i) => i !== 'sol').map((id) => ({ id })),
        });
      }),
    );

    expect((await cron.GET(new Request('http://localhost/api/cron/scryfall'))).status).toBe(401);
    const run = () =>
      cron.GET(
        new Request('http://localhost/api/cron/scryfall', {
          headers: { Authorization: 'Bearer segredo-do-cron-123' },
        }),
      );
    const first = await run();
    expect(await first.json()).toEqual({ checked: 2, updated: 1, missing: 1 });
    expect(requested[0]!.sort()).toEqual(['gone', 'sol']);
    const all = await db.select().from(schema.cards);
    const sol = all.find((c) => c.scryfallId === 'sol');
    expect(sol!.priceUsd).toBe('2.50');
    const loose = all.find((c) => c.scryfallId === 'loose');
    expect(loose!.updatedAt).toEqual(old);

    // Logo em seguida não há nada velho para atualizar.
    expect(await (await run()).json()).toEqual({ checked: 0, updated: 0, missing: 0 });
    expect(requested).toHaveLength(1);
  });
});
