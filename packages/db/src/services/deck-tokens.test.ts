import { mapScryfallCard } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { listCollection } from './collection';
import { getDeck, listDecks, saveImportedDeck } from './decks';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const card = (id: string, name: string, type: string) =>
  mapScryfallCard({ id, name, type_line: type, set: 'tst', collector_number: id, legalities: {} });

describe('tokens e emblemas no deck', () => {
  it('ficam na categoria "tokens", fora do total e da coleção (mesmo vindos do "talvez")', async () => {
    const ana = await createTestUser(db);
    const saved = await saveImportedDeck(db, {
      ownerId: ana.id,
      deck: {
        name: 'Com tokens',
        source: 'text',
        entries: [
          { name: 'Forest', quantity: 10, board: 'mainboard', scryfallId: 'forest' },
          { name: 'Soldier', quantity: 3, board: 'maybeboard', scryfallId: 'soldier' },
          { name: 'Emblem — Liliana', quantity: 1, board: 'tokens', scryfallId: 'emblem' },
        ],
      },
      cards: [
        card('forest', 'Forest', 'Basic Land — Forest'),
        card('soldier', 'Soldier', 'Token Creature — Soldier'),
        card('emblem', 'Emblem — Liliana', 'Emblem — Liliana'),
      ],
    });
    const view = await getDeck(db, { deckId: saved.id, viewerId: ana.id });
    expect(view.lines.map((l) => [l.name, l.board]).sort()).toEqual([
      ['Emblem — Liliana', 'tokens'],
      ['Forest', 'mainboard'],
      ['Soldier', 'tokens'],
    ]);
    expect((await listDecks(db, ana.id))[0]!.cardCount).toBe(10);
    expect((await listCollection(db, ana.id)).map((c) => c.name)).toEqual(['Forest']);
  });
});
