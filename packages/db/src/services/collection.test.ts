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
import { deleteDeck, getDeck, moveLinePrint, saveImportedDeck, setDeckLine } from './decks';

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

  it('trocar a edição no deck move as cópias na coleção; "em decks" é por versão', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('B', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-ltc' },
      ]),
      cards: [solLtc],
    });
    let list = await listCollection(db, me.id);
    // Cada versão mostra só o deck que usa aquela versão.
    expect(list.map((e) => [e.scryfallId, e.quantity, e.decks.map((d) => d.deckName)])).toEqual([
      ['sol-c21', 1, ['A']],
      ['sol-ltc', 1, ['B']],
    ]);

    await moveLinePrint(db, {
      deckId: a.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Sol Ring',
      fromScryfallId: 'sol-c21',
      card: solLtc,
      quantity: 1,
    });
    list = await listCollection(db, me.id);
    expect(list.map((e) => [e.scryfallId, e.quantity, e.decks.map((d) => d.deckName)])).toEqual([
      ['sol-ltc', 2, ['A', 'B']],
    ]);
  });

  it('foil é outra versão: marcar foil no deck move a cópia para a versão foil', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 2, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    await setDeckLine(db, {
      deckId: a.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Sol Ring',
      quantity: 2,
      proxies: 0,
      card: sol,
      scryfallId: 'sol-c21',
      foil: true,
    });
    const list = await listCollection(db, me.id);
    expect(list.map((e) => [e.foil, e.quantity, e.decks.map((d) => d.deckName)])).toEqual([
      [true, 2, ['A']],
    ]);
  });

  it('foil e comum da mesma edição no mesmo deck: cada um na sua versão da coleção', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 2, board: 'mainboard', scryfallId: 'sol-c21', isFoil: true },
      ]),
      cards: [sol],
    });
    // Desmarca o foil de uma das duas cópias.
    const line = await setDeckLine(db, {
      deckId: a.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Sol Ring',
      quantity: 2,
      proxies: 0,
      card: sol,
      scryfallId: 'sol-c21',
      foils: 1,
    });
    expect(line).toMatchObject({ foils: 1, foil: false });
    const byFoil = (l: Awaited<ReturnType<typeof listCollection>>) =>
      [...l].sort((x, y) => Number(x.foil) - Number(y.foil));
    let list = byFoil(await listCollection(db, me.id));
    expect(list.map((e) => [e.foil, e.quantity, e.decks.map((d) => d.quantity)])).toEqual([
      [false, 1, [1]],
      [true, 1, [1]],
    ]);

    // Mais uma cópia: entra comum, o foil que já existia continua.
    await setDeckLine(db, {
      deckId: a.id,
      userId: me.id,
      board: 'mainboard',
      name: 'Sol Ring',
      quantity: 3,
      proxies: 0,
      card: sol,
      scryfallId: 'sol-c21',
    });
    list = byFoil(await listCollection(db, me.id));
    expect(list.map((e) => [e.foil, e.quantity])).toEqual([
      [false, 2],
      [true, 1],
    ]);
  });

  it('trocar a impressão na coleção troca nos decks: a antiga não volta na sincronia', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 2, board: 'mainboard', scryfallId: 'sol-c21' },
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21', isProxy: true },
      ]),
      cards: [sol],
    });
    const entry = async () =>
      (await listCollection(db, me.id)).find((e) => e.scryfallId === 'sol-c21')!;
    const deckLines = async () =>
      (await getDeck(db, { deckId: a.id, viewerId: me.id })).lines
        .map((l) => [l.scryfallId, l.quantity, l.proxies])
        .sort((x, y) => String(x[0]).localeCompare(String(y[0])));

    // Todas as cópias: as reais do deck mudam; a proxy fica (não é da coleção).
    await updateCollectionCard(db, { userId: me.id, id: (await entry()).id, card: solLtc });
    await syncCollectionFromDecks(db, me.id);
    expect((await listCollection(db, me.id)).map((e) => [e.scryfallId, e.quantity])).toEqual([
      ['sol-ltc', 2],
    ]);
    expect(await deckLines()).toEqual([
      ['sol-c21', 1, 1],
      ['sol-ltc', 2, 0],
    ]);
  });

  it('trocar parte das cópias: o deck só muda o que não cabe mais na versão antiga', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 2, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    const id = (await listCollection(db, me.id))[0]!.id;
    // 4 na coleção (2 fora de deck): mudar 2 não mexe no deck.
    await updateCollectionCard(db, { userId: me.id, id, quantity: 4 });
    await updateCollectionCard(db, { userId: me.id, id, card: solLtc, copies: 2 });
    const lines = async () =>
      (await getDeck(db, { deckId: a.id, viewerId: me.id })).lines.map((l) => [
        l.scryfallId,
        l.quantity,
      ]);
    expect(await lines()).toEqual([['sol-c21', 2]]);
    // Mais 1 da antiga: sobra 1 na coleção, então 1 cópia do deck vai para a nova.
    await updateCollectionCard(db, { userId: me.id, id, card: solLtc, copies: 1 });
    await syncCollectionFromDecks(db, me.id);
    expect(
      (await listCollection(db, me.id))
        .map((e) => [e.scryfallId, e.quantity])
        .sort((x, y) => String(x[0]).localeCompare(String(y[0]))),
    ).toEqual([
      ['sol-c21', 1],
      ['sol-ltc', 3],
    ]);
    expect((await lines()).sort((x, y) => String(x[0]).localeCompare(String(y[0])))).toEqual([
      ['sol-c21', 1],
      ['sol-ltc', 1],
    ]);
    await expect(
      updateCollectionCard(db, { userId: me.id, id, card: solLtc, copies: 5 }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('marcar foil na coleção marca também as cópias do deck', async () => {
    const me = await createTestUser(db);
    const a = await saveImportedDeck(db, {
      ownerId: me.id,
      deck: deck('A', [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-c21' },
      ]),
      cards: [sol],
    });
    const id = (await listCollection(db, me.id))[0]!.id;
    await updateCollectionCard(db, { userId: me.id, id, foil: true });
    await syncCollectionFromDecks(db, me.id);
    expect((await listCollection(db, me.id)).map((e) => [e.foil, e.quantity])).toEqual([[true, 1]]);
    expect((await getDeck(db, { deckId: a.id, viewerId: me.id })).lines[0]).toMatchObject({
      foils: 1,
    });
  });
});
