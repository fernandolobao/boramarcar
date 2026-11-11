import { mapScryfallCard, type ImportedDeck } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import {
  addCollectionCard,
  listCollection,
  removeCollectionCard,
  syncCollectionFromDecks,
  updateCollectionCard,
} from './collection';
import { deleteDeck, saveImportedDeck, setDeckLine } from './decks';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const sol = mapScryfallCard({
  id: 'sol-c21',
  name: 'Sol Ring',
  cmc: 1,
  mana_cost: '{1}',
  type_line: 'Artifact',
  color_identity: [],
  set: 'c21',
  set_name: 'Commander 2021',
  collector_number: '263',
  artist: 'Mike Bierek',
  released_at: '2021-04-23',
  rarity: 'uncommon',
  prices: { usd: '1.50', usd_foil: '4.00' },
});
const solLtc = { ...sol, scryfallId: 'sol-ltc', setCode: 'ltc', setName: 'LotR Commander' };
const forest = mapScryfallCard({
  id: 'forest',
  name: 'Forest',
  cmc: 0,
  type_line: 'Basic Land — Forest',
  color_identity: ['G'],
});

const deck = (name: string, entries: ImportedDeck['entries']): ImportedDeck => ({
  name,
  source: 'text',
  entries,
});

describe('coleção', () => {
  it('nasce dos decks: soma entre decks, sem proxies nem maybeboard', async () => {
    const me = await createTestUser(db);
    await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
        { name: 'Forest', quantity: 10, board: 'mainboard', scryfallId: 'forest' },
        { name: 'Forest', quantity: 3, board: 'mainboard', scryfallId: 'forest', isProxy: true },
        { name: 'Sol Ring', quantity: 1, board: 'maybeboard', scryfallId: 'sol-ltc' },
      ]),
      cards: [sol, solLtc, forest],
    });
    await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('B', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    const list = await listCollection(db, me.id);
    expect(list.map((e) => [e.name, e.scryfallId, e.quantity, e.foil])).toEqual([
      ['Forest', 'forest', 10, false],
      ['Sol Ring', 'sol-c21', 2, false],
    ]);
    const solEntry = list.find((e) => e.name === 'Sol Ring')!;
    expect(solEntry.card).toMatchObject({
      artist: 'Mike Bierek',
      releasedAt: '2021-04-23',
      rarity: 'uncommon',
      priceUsdFoil: '4.00',
    });
    expect(solEntry.decks.map((d) => d.deckName)).toEqual(['A', 'B']);
    const forestEntry = list.find((e) => e.name === 'Forest')!;
    expect(forestEntry.decks).toEqual([
      expect.objectContaining({ deckName: 'A', quantity: 13, proxies: 3 }),
    ]);
  });

  it('decks só acrescentam: aumentar soma, tirar do deck não tira da coleção', async () => {
    const me = await createTestUser(db);
    const saved = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    await setDeckLine(db, {
      deckId: saved.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 5,
      proxies: 2,
      card: forest,
    });
    let list = await listCollection(db, me.id);
    expect(list.find((e) => e.name === 'Forest')?.quantity).toBe(3);

    await setDeckLine(db, {
      deckId: saved.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 0,
      proxies: 0,
    });
    await deleteDeck(db, { deckId: saved.id, userId: me.id });
    await syncCollectionFromDecks(db, me.id);
    list = await listCollection(db, me.id);
    expect(list.map((e) => [e.name, e.quantity])).toEqual([
      ['Forest', 3],
      ['Sol Ring', 1],
    ]);
    expect(list.every((e) => e.decks.length === 0)).toBe(true);
  });

  it('a coleção pode ter mais do que os decks; os decks nunca reduzem', async () => {
    const me = await createTestUser(db);
    await addCollectionCard(db, { userId: me.id, card: sol, quantity: 4, foil: false });
    await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    expect((await listCollection(db, me.id))[0]?.quantity).toBe(4);
  });

  it('editar: quantidade, foil (soma na linha que já existe), impressão e remover', async () => {
    const me = await createTestUser(db);
    await addCollectionCard(db, { userId: me.id, card: sol, quantity: 2, foil: false });
    await addCollectionCard(db, { userId: me.id, card: sol, quantity: 1, foil: true });
    const plain = (await listCollection(db, me.id)).find((e) => !e.foil);
    await updateCollectionCard(db, { userId: me.id, id: plain!.id, quantity: 3 });
    await updateCollectionCard(db, { userId: me.id, id: plain!.id, foil: true });
    let list = await listCollection(db, me.id);
    expect(list.map((e) => [e.foil, e.quantity])).toEqual([[true, 4]]);

    await updateCollectionCard(db, { userId: me.id, id: list[0]!.id, card: solLtc });
    list = await listCollection(db, me.id);
    expect(list[0]).toMatchObject({ scryfallId: 'sol-ltc', foil: true, quantity: 4 });
    await expect(
      updateCollectionCard(db, { userId: me.id, id: list[0]!.id, card: forest }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    const other = await createTestUser(db);
    await expect(
      removeCollectionCard(db, { userId: other.id, id: list[0]!.id }),
    ).rejects.toMatchObject({ code: 'not_found' });
    await updateCollectionCard(db, { userId: me.id, id: list[0]!.id, quantity: 0 });
    expect(await listCollection(db, me.id)).toEqual([]);
  });
});
