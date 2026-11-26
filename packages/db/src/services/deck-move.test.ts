import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { addDeckCopies, createDeck, getDeck, moveDeckCard } from './decks';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const setup = async () => {
  const { players } = await seedGroup(db, 2);
  const ana = players[0]!;
  const bia = players[1]!;
  const deck = await createDeck(db, {
    ownerId: ana.id,
    name: 'Teste',
    format: 'commander',
    draft: false,
  });
  const add = (name: string, board: 'mainboard' | 'maybeboard', quantity: number, proxies = 0) =>
    addDeckCopies(db, { deckId: deck.id, userId: ana.id, board, name, quantity, proxies });
  const lines = async () =>
    (await getDeck(db, { deckId: deck.id, viewerId: ana.id })).lines
      .map((l) => [l.name, l.board, l.quantity, l.proxies] as const)
      .sort();
  return { ana, bia, deck, add, lines };
};

describe('mover ou remover uma carta do deck (11.5)', () => {
  it('move todas as cópias para "talvez", juntando com o que já estava lá', async () => {
    const { ana, deck, add, lines } = await setup();
    await add('Wrath of God', 'mainboard', 2, 1);
    await add('Wrath of God', 'maybeboard', 1);
    await moveDeckCard(db, {
      deckId: deck.id,
      userId: ana.id,
      name: 'wrath of god',
      from: 'mainboard',
      to: 'maybeboard',
    });
    expect(await lines()).toEqual([['Wrath of God', 'maybeboard', 3, 1]]);
  });

  it('remove a carta do board (to: null) e não mexe nos outros', async () => {
    const { ana, deck, add, lines } = await setup();
    await add('Wrath of God', 'mainboard', 1);
    await add('Wrath of God', 'maybeboard', 1);
    await moveDeckCard(db, {
      deckId: deck.id,
      userId: ana.id,
      name: 'Wrath of God',
      from: 'mainboard',
      to: null,
    });
    expect(await lines()).toEqual([['Wrath of God', 'maybeboard', 1, 0]]);
  });

  it('só o dono; carta que não está no board é erro', async () => {
    const { ana, bia, deck, add } = await setup();
    await add('Wrath of God', 'mainboard', 1);
    await expect(
      moveDeckCard(db, {
        deckId: deck.id,
        userId: bia.id,
        name: 'Wrath of God',
        from: 'mainboard',
        to: null,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      moveDeckCard(db, {
        deckId: deck.id,
        userId: ana.id,
        name: 'Sol Ring',
        from: 'mainboard',
        to: 'maybeboard',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
