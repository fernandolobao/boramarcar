import { mapScryfallCard } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { addCollectionCard, listCollection } from './collection';
import { draftCollectionMatches, getDeck, publishDeck, saveImportedDeck } from './decks';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const print = (id: string, name: string, set: string) =>
  mapScryfallCard({
    id,
    name,
    type_line: name === 'Forest' ? 'Basic Land — Forest' : 'Artifact',
    set,
    set_name: set.toUpperCase(),
    collector_number: '1',
    legalities: {},
  });
const solA = print('sol-a', 'Sol Ring', 'cmm');
const solB = print('sol-b', 'Sol Ring', 'ltc');
const forest = print('forest', 'Forest', 'tst');

/** Coleção com 2 Sol Ring (edição A), um deles já usado num deck publicado; e um rascunho. */
async function setup() {
  const ana = await createTestUser(db);
  await addCollectionCard(db, { userId: ana.id, card: solA, quantity: 2, foil: false });
  await saveImportedDeck(db, {
    ownerId: ana.id,
    deck: {
      name: 'Publicado',
      source: 'text',
      entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-a' }],
    },
    cards: [solA],
  });
  const draft = await saveImportedDeck(db, {
    ownerId: ana.id,
    deck: {
      name: 'Ideia',
      source: 'text',
      entries: [
        { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-b' },
        { name: 'Forest', quantity: 10, board: 'mainboard', scryfallId: 'forest' },
      ],
    },
    cards: [solB, forest],
    draft: true,
  });
  return { ana, draft };
}

const solRings = async (userId: string) =>
  (await listCollection(db, userId))
    .filter((c) => c.name === 'Sol Ring')
    .map((c) => [c.scryfallId, c.quantity]);

describe('rascunho e coleção', () => {
  it('aponta as cartas do rascunho que você já tem livres na coleção, em qualquer edição', async () => {
    const { ana, draft } = await setup();
    const matches = await draftCollectionMatches(db, { deckId: draft.id, userId: ana.id });
    expect(matches).toEqual([
      expect.objectContaining({
        name: 'Sol Ring',
        free: 1,
        options: [expect.objectContaining({ scryfallId: 'sol-a', foil: false, free: 1 })],
      }),
    ]);
  });

  it('publicar usando a da coleção: a carta do deck passa para a edição que você tem, sem somar', async () => {
    const { ana, draft } = await setup();
    await publishDeck(db, {
      deckId: draft.id,
      userId: ana.id,
      choices: [
        {
          name: 'Sol Ring',
          board: 'mainboard',
          fromScryfallId: 'sol-b',
          use: { scryfallId: 'sol-a', foil: false },
        },
      ],
    });
    const view = await getDeck(db, { deckId: draft.id, viewerId: ana.id });
    expect(view.lines.find((l) => l.name === 'Sol Ring')!.scryfallId).toBe('sol-a');
    expect(await solRings(ana.id)).toEqual([['sol-a', 2]]);
    expect((await listCollection(db, ana.id)).find((c) => c.name === 'Forest')!.quantity).toBe(10);
  });

  it('publicar adicionando como nova: a edição do deck entra na coleção', async () => {
    const { ana, draft } = await setup();
    await publishDeck(db, { deckId: draft.id, userId: ana.id, choices: [] });
    expect((await solRings(ana.id)).sort()).toEqual([
      ['sol-a', 2],
      ['sol-b', 1],
    ]);
  });

  it('escolha que não bate com o que está livre é recusada', async () => {
    const { ana, draft } = await setup();
    await expect(
      publishDeck(db, {
        deckId: draft.id,
        userId: ana.id,
        choices: [
          {
            name: 'Sol Ring',
            board: 'mainboard',
            fromScryfallId: 'sol-b',
            use: { scryfallId: 'outra', foil: false },
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('a mesma cópia livre não serve duas linhas do rascunho', async () => {
    const { ana } = await setup();
    const twice = await saveImportedDeck(db, {
      ownerId: ana.id,
      deck: {
        name: 'Duas linhas',
        source: 'text',
        entries: [
          { name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol-b' },
          { name: 'Sol Ring', quantity: 1, board: 'sideboard', scryfallId: 'sol-b' },
        ],
      },
      cards: [solB],
      draft: true,
    });
    const use = { scryfallId: 'sol-a', foil: false };
    await expect(
      publishDeck(db, {
        deckId: twice.id,
        userId: ana.id,
        choices: [
          { name: 'Sol Ring', board: 'mainboard', fromScryfallId: 'sol-b', use },
          { name: 'Sol Ring', board: 'sideboard', fromScryfallId: 'sol-b', use },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    // Nada mudou: a primeira linha continua na edição do rascunho.
    const view = await getDeck(db, { deckId: twice.id, viewerId: ana.id });
    expect(view.lines.every((l) => l.scryfallId === 'sol-b')).toBe(true);
    expect(view.status).toBe('draft');
  });
});
