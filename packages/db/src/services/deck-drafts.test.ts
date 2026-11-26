import { mapScryfallCard } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { listCollection } from './collection';
import {
  addDeckCopies,
  createDeck,
  getDeck,
  listDecksForUsers,
  publishDeck,
  saveImportedDeck,
  updateDeck,
} from './decks';
import { createEvent, recordGame } from './events';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const omnath = mapScryfallCard({
  id: 'omnath',
  name: 'Omnath, Locus of Mana',
  cmc: 3,
  mana_cost: '{2}{G}',
  type_line: 'Legendary Creature — Elemental',
  color_identity: ['G'],
  set: 'tst',
  collector_number: '1',
  legalities: { commander: 'legal' },
});

describe('deck do zero e rascunho (11.1 e 11.2)', () => {
  it('cria do zero como rascunho: as cartas não entram na coleção até publicar', async () => {
    const { players } = await seedGroup(db, 2);
    const ana = players[0]!;
    const deck = await createDeck(db, {
      ownerId: ana.id,
      name: 'Ideia de Omnath',
      format: 'commander',
      commander: omnath,
      draft: true,
    });
    expect(deck.status).toBe('draft');
    await addDeckCopies(db, {
      deckId: deck.id,
      userId: ana.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 10,
      proxies: 0,
    });
    const view = await getDeck(db, { deckId: deck.id, viewerId: ana.id });
    expect(view.lines.map((l) => [l.name, l.board, l.quantity])).toEqual(
      expect.arrayContaining([
        ['Omnath, Locus of Mana', 'commander', 1],
        ['Forest', 'mainboard', 10],
      ]),
    );
    expect(await listCollection(db, ana.id)).toEqual([]);

    await publishDeck(db, { deckId: deck.id, userId: ana.id });
    const collection = await listCollection(db, ana.id);
    expect(collection.map((c) => [c.name, c.quantity]).sort()).toEqual([
      ['Forest', 10],
      ['Omnath, Locus of Mana', 1],
    ]);
    expect((await getDeck(db, { deckId: deck.id, viewerId: ana.id })).status).toBe('published');
  });

  it('sem rascunho, o deck do zero já nasce publicado; nome e formato são conferidos', async () => {
    const { players } = await seedGroup(db, 1);
    const deck = await createDeck(db, {
      ownerId: players[0]!.id,
      name: '  Pauper  ',
      format: 'pauper',
      draft: false,
    });
    expect(deck).toMatchObject({ status: 'published', name: 'Pauper', format: 'pauper' });
    await expect(
      createDeck(db, { ownerId: players[0]!.id, name: ' ', format: 'pauper', draft: false }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createDeck(db, { ownerId: players[0]!.id, name: 'X', format: 'xadrez', draft: false }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('importado como rascunho também fica fora da coleção', async () => {
    const { players } = await seedGroup(db, 1);
    const ana = players[0]!;
    await saveImportedDeck(db, {
      ownerId: ana.id,
      deck: {
        name: 'Importado',
        source: 'text',
        entries: [{ name: 'Forest', quantity: 5, board: 'mainboard' }],
      },
      cards: [],
      draft: true,
    });
    expect(await listCollection(db, ana.id)).toEqual([]);
  });

  it('rascunho é só do dono: ninguém mais vê, e não entra na escolha de deck nem numa partida', async () => {
    const { players, group, owner } = await seedGroup(db, 2);
    const [ana, bia] = players;
    const draft = await createDeck(db, {
      ownerId: ana!.id,
      name: 'Segredo',
      format: 'commander',
      draft: true,
    });
    await expect(getDeck(db, { deckId: draft.id, viewerId: bia!.id })).rejects.toBeTruthy();
    expect(await listDecksForUsers(db, [ana!.id], ana!.id)).toEqual([]);
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Noite',
      startsAt: new Date('2026-11-20T22:00:00Z'),
    });
    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: owner.id,
        format: 'commander',
        players: [
          { userId: ana!.id, result: 'win', deckId: draft.id },
          { userId: bia!.id, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('visibilidade do rascunho', () => {
  it('rascunho nasce privado, não muda de visibilidade e ganha a escolhida ao publicar', async () => {
    const { players } = await seedGroup(db, 1);
    const ana = players[0]!;
    const deck = await createDeck(db, {
      ownerId: ana.id,
      name: 'Privado até publicar',
      format: 'commander',
      draft: true,
    });
    expect(deck.visibility).toBe('private');
    await expect(
      updateDeck(db, { deckId: deck.id, userId: ana.id, visibility: 'public' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    // Renomear o rascunho continua valendo.
    expect(
      (await updateDeck(db, { deckId: deck.id, userId: ana.id, name: 'Novo nome' })).name,
    ).toBe('Novo nome');
    const published = await publishDeck(db, {
      deckId: deck.id,
      userId: ana.id,
      visibility: 'public',
    });
    expect(published).toMatchObject({ status: 'published', visibility: 'public' });
  });

  it('importar como rascunho também nasce privado; publicar sem escolher vai para o grupo', async () => {
    const { players } = await seedGroup(db, 1);
    const ana = players[0]!;
    const saved = await saveImportedDeck(db, {
      ownerId: ana.id,
      deck: {
        name: 'Importado',
        source: 'text',
        entries: [{ name: 'Forest', quantity: 1, board: 'mainboard' }],
      },
      cards: [],
      draft: true,
    });
    const id = saved.id;
    expect(saved.visibility).toBe('private');
    expect((await publishDeck(db, { deckId: id, userId: ana.id })).visibility).toBe('group');
  });
});
