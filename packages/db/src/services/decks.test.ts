import { mapScryfallCard, type ImportedDeck } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import {
  deckCardsForEnrichment,
  saveBracketSignals,
  saveCardRoles,
  deleteDeck,
  getDeck,
  getDeckRatings,
  listDecks,
  listDecksForUsers,
  getPublicDeckPreview,
  saveImportedDeck,
  updateDeck,
  setDeckCardProxy,
  upsertCards,
} from './decks';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const cardsData = [
  mapScryfallCard({
    id: 'omnath',
    name: 'Omnath, Locus of Mana',
    cmc: 3,
    mana_cost: '{2}{G}',
    type_line: 'Legendary Creature — Elemental',
    color_identity: ['G'],
    set: 'tst',
    collector_number: '1',
    legalities: { commander: 'legal' },
  }),
  mapScryfallCard({
    id: 'sol',
    name: 'Sol Ring',
    cmc: 1,
    mana_cost: '{1}',
    type_line: 'Artifact',
    oracle_text: '{T}: Add {C}{C}.',
    color_identity: [],
    set: 'tst',
    collector_number: '2',
    legalities: { commander: 'legal' },
  }),
  mapScryfallCard({
    id: 'forest',
    name: 'Forest',
    cmc: 0,
    type_line: 'Basic Land — Forest',
    color_identity: ['G'],
    set: 'tst',
    collector_number: '3',
    legalities: { commander: 'legal' },
  }),
];

const deck: ImportedDeck = {
  name: 'Omnath Ramp',
  source: 'archidekt',
  sourceId: '1',
  sourceUrl: 'https://archidekt.com/decks/1',
  entries: [
    { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander', scryfallId: 'omnath' },
    { name: 'sol ring', quantity: 1, board: 'mainboard' },
    { name: 'Forest', quantity: 30, board: 'mainboard' },
    { name: 'Carta Inventada', quantity: 1, board: 'mainboard', isProxy: true },
  ],
};

describe('decks', () => {
  it('salva deck importado, lista e analisa', async () => {
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });

    const list = await listDecks(db, owner.id);
    expect(list).toEqual([
      expect.objectContaining({
        id: saved.id,
        name: 'Omnath Ramp',
        cardCount: 33,
        proxyCount: 1,
        lines: 4,
      }),
    ]);

    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.isOwner).toBe(true);
    expect(detail.entries.find((e) => e.name === 'Sol Ring')?.card?.scryfallId).toBe('sol');
    expect(detail.entries.find((e) => e.name === 'Carta Inventada')?.card).toBeNull();
    expect(detail.analysis).toMatchObject({
      lands: 30,
      colorIdentity: ['G'],
      proxies: 1,
      roles: { ramp: 1 },
    });
    expect(detail.analysis.validation).toContainEqual({
      code: 'unknown_card',
      name: 'Carta Inventada',
    });
  });

  it('nota e bracket para a lista de decks são os mesmos da página do deck', async () => {
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });
    const modern = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: { ...deck, name: 'Modern', format: 'modern', sourceId: '2' } as ImportedDeck,
      cards: [],
    });
    const ratings = await getDeckRatings(db, [saved.id, modern.id, saved.id]);
    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(ratings.get(saved.id)).toEqual({
      score: detail.analysis.score,
      bracket: detail.bracket!.minimum,
    });
    const modernDetail = await getDeck(db, { deckId: modern.id, viewerId: owner.id });
    expect(ratings.get(modern.id)?.score).toBe(modernDetail.analysis.score);
    expect(ratings.get(modern.id)?.bracket).toBe(modernDetail.bracket?.minimum ?? null);
    expect(await getDeckRatings(db, [])).toEqual(new Map());
  });

  it('atualiza o cache de cartas e reaproveita na importação', async () => {
    await upsertCards(db, [{ ...cardsData[1]!, priceUsd: '1.50' }]);
    await upsertCards(db, [{ ...cardsData[1]!, priceUsd: '2.00' }]);
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'x',
        source: 'text',
        entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard', scryfallId: 'sol' }],
      },
      cards: [],
    });
    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    // Sem dados novos do Scryfall, a carta é encontrada no cache local
    expect(detail.entries[0]?.card).toMatchObject({ scryfallId: 'sol', priceUsd: '2.00' });
  });

  it('marca proxy e une com linha existente', async () => {
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'Proxies',
        source: 'text',
        entries: [
          { name: 'Forest', quantity: 10, board: 'mainboard' },
          { name: 'Forest', quantity: 2, board: 'mainboard', isProxy: true },
          { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
        ],
      },
      cards: cardsData,
    });
    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    const sol = detail.entries.find((e) => e.name === 'Sol Ring')!;
    const proxyForest = detail.entries.find((e) => e.name === 'Forest' && e.isProxy)!;

    const updated = await setDeckCardProxy(db, {
      deckId: saved.id,
      deckCardId: sol.id,
      userId: owner.id,
      isProxy: true,
    });
    expect(updated.isProxy).toBe(true);

    const merged = await setDeckCardProxy(db, {
      deckId: saved.id,
      deckCardId: proxyForest.id,
      userId: owner.id,
      isProxy: false,
    });
    expect(merged.quantity).toBe(12);
    const after = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(after.entries.filter((e) => e.name === 'Forest')).toHaveLength(1);
    expect(after.analysis.proxies).toBe(1);
  });

  it('controla visibilidade e permissões', async () => {
    const { players } = await seedGroup(db, 2);
    const [owner, friend] = players;
    const stranger = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner!.id, deck, cards: cardsData });

    expect(await listDecksForUsers(db, [owner!.id, friend!.id])).toEqual([
      { id: saved.id, name: 'Omnath Ramp', ownerId: owner!.id, format: 'commander' },
    ]);
    expect(await listDecksForUsers(db, [])).toEqual([]);
    await expect(getDeck(db, { deckId: saved.id, viewerId: friend!.id })).resolves.toMatchObject({
      isOwner: false,
    });
    await expect(getDeck(db, { deckId: saved.id, viewerId: stranger.id })).rejects.toMatchObject({
      code: 'forbidden',
    });

    const lineId = (await getDeck(db, { deckId: saved.id, viewerId: owner!.id })).entries[0]!.id;
    await expect(
      setDeckCardProxy(db, {
        deckId: saved.id,
        deckCardId: lineId,
        userId: friend!.id,
        isProxy: true,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(deleteDeck(db, { deckId: saved.id, userId: friend!.id })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await deleteDeck(db, { deckId: saved.id, userId: owner!.id });
    await expect(getDeck(db, { deckId: saved.id, viewerId: owner!.id })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('rejeita deck vazio ou sem nome', async () => {
    const owner = await createTestUser(db);
    await expect(
      saveImportedDeck(db, { ownerId: owner.id, deck: { ...deck, name: ' ' }, cards: [] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      saveImportedDeck(db, { ownerId: owner.id, deck: { ...deck, entries: [] }, cards: [] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('prévia de compartilhamento', () => {
  it('só decks públicos aparecem, com nome, comandante e arte', async () => {
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });
    expect(await getPublicDeckPreview(db, saved.id)).toBeNull();
    await updateDeck(db, { deckId: saved.id, userId: owner.id, visibility: 'public' });
    expect(await getPublicDeckPreview(db, saved.id)).toMatchObject({
      name: 'Omnath Ramp',
      commanders: ['Omnath, Locus of Mana'],
    });
    expect(await getPublicDeckPreview(db, 'nao-existe')).toBeNull();
    // Não interfere na comparação (decks visíveis do mesmo comandante).
    await deleteDeck(db, { deckId: saved.id, userId: owner.id });
  });
});

describe('editar deck', () => {
  it('só o dono renomeia e muda o tipo de jogo; valida os dados', async () => {
    const { updateDeck } = await import('./decks');
    const owner = await createTestUser(db);
    const other = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });
    await expect(
      updateDeck(db, { deckId: saved.id, userId: other.id, name: 'X' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      updateDeck(db, { deckId: saved.id, userId: owner.id, format: 'banana' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      updateDeck(db, { deckId: saved.id, userId: owner.id, name: '  ' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(updateDeck(db, { deckId: 'nope', userId: owner.id })).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(
      await updateDeck(db, {
        deckId: saved.id,
        userId: owner.id,
        name: ' Omnath 2 ',
        format: 'brawl',
      }),
    ).toMatchObject({ name: 'Omnath 2', format: 'brawl' });
    expect((await listDecks(db, owner.id))[0]).toMatchObject({ name: 'Omnath 2', format: 'brawl' });
  });
});

describe('editor e sincronização', () => {
  it('define quantidades e proxies por carta, remove com 0 e só o dono edita', async () => {
    const { setDeckLine, findCachedCardByName } = await import('./decks');
    const owner = await createTestUser(db);
    const other = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });

    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'forest',
      quantity: 10,
      proxies: 3,
      card: cardsData[2],
    });
    let detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.lines.find((l) => l.name === 'Forest')).toMatchObject({
      quantity: 10,
      proxies: 3,
    });
    expect(
      detail.entries.filter((e) => e.name === 'Forest').map((e) => [e.quantity, e.isProxy]),
    ).toEqual(
      expect.arrayContaining([
        [7, false],
        [3, true],
      ]),
    );

    // Foil: marcar vale para as cópias reais; cópias novas entram comuns (os foil continuam).
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 10,
      proxies: 3,
      card: cardsData[2],
      foil: true,
    });
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 12,
      proxies: 3,
      card: cardsData[2],
    });
    detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.lines.find((l) => l.name === 'Forest')).toMatchObject({
      quantity: 12,
      foils: 7,
      foil: false,
    });
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Forest',
      quantity: 10,
      proxies: 3,
      card: cardsData[2],
      foil: false,
    });

    // Carta nova pelo nome (sem dados do Scryfall) e remoção com quantidade 0.
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'sideboard',
      name: 'Nova',
      quantity: 2,
      proxies: 0,
    });
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Sol Ring',
      quantity: 0,
      proxies: 0,
    });
    detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.lines.map((l) => `${l.board}:${l.name}:${l.quantity}`).sort()).toEqual(
      [
        'commander:Omnath, Locus of Mana:1',
        'mainboard:Forest:10',
        'mainboard:Carta Inventada:1',
        'sideboard:Nova:2',
      ].sort(),
    );

    await expect(
      setDeckLine(db, {
        deckId: saved.id,
        userId: other.id,
        board: 'mainboard',
        name: 'X',
        quantity: 1,
        proxies: 0,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      setDeckLine(db, {
        deckId: saved.id,
        userId: owner.id,
        board: 'mainboard',
        name: 'X',
        quantity: 1,
        proxies: 2,
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await findCachedCardByName(db, 'SOL RING')).toMatchObject({ scryfallId: 'sol' });
    expect(await findCachedCardByName(db, 'nada')).toBeNull();
  });

  it('sincroniza com a lista nova mantendo proxies', async () => {
    const { syncDeckCards } = await import('./decks');
    const owner = await createTestUser(db);
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });
    const result = await syncDeckCards(db, {
      deckId: saved.id,
      userId: owner.id,
      cards: [],
      entries: [
        { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander' },
        { name: 'Forest', quantity: 20, board: 'mainboard' },
        { name: 'Carta Inventada', quantity: 2, board: 'mainboard' },
      ],
    });
    expect(result).toEqual({
      added: [],
      removed: ['Sol Ring'],
      changed: ['Forest', 'Carta Inventada'],
    });
    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.lines.map((l) => [l.name, l.board, l.quantity, l.proxies])).toEqual(
      expect.arrayContaining([
        ['Forest', 'mainboard', 20, 0],
        ['Carta Inventada', 'mainboard', 2, 1],
      ]),
    );
    expect(detail.lines.find((l) => l.name === 'Forest')!.card).toMatchObject({
      scryfallId: 'forest',
    });
  });
});

describe('análise (formato, Tagger e bracket)', () => {
  it('guarda o formato da importação e analisa conforme ele', async () => {
    const owner = await createTestUser(db, { name: 'Formato' });
    const saved = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: { ...deck, name: 'Mono-G Modern' },
      cards: cardsData,
      format: 'modern',
    });
    expect(saved.format).toBe('modern');
    const detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.analysis.kind).toBe('constructed');
    expect(detail.analysis.score).toBeNull();
    expect(detail.bracket).toBeNull();
    await expect(
      saveImportedDeck(db, { ownerId: owner.id, deck, cards: [], format: 'xadrez' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('lista cartas a enriquecer, grava funções e sinais de bracket', async () => {
    const owner = await createTestUser(db, { name: 'Bracket' });
    const saved = await saveImportedDeck(db, { ownerId: owner.id, deck, cards: cardsData });
    let detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.analysisStale).toBe(true);
    expect(detail.bracket).toMatchObject({ minimum: 2, source: 'local' });
    expect('bracketSignals' in detail).toBe(false);

    const pending = await deckCardsForEnrichment(db, saved.id);
    expect(pending.missingMana).toEqual([]);
    expect(pending.staleRoles.map((c) => c.name).sort()).toEqual([
      'Forest',
      'Omnath, Locus of Mana',
      'Sol Ring',
    ]);
    await saveCardRoles(
      db,
      pending.staleRoles.map((c) => ({
        scryfallId: c.scryfallId,
        roles: c.name === 'Sol Ring' ? ['ramp'] : [],
      })),
    );
    const { deckListHash, spellbookDeck } = await import('@boramarcar/core');
    const before = detail.updatedAt;
    await saveBracketSignals(db, {
      deckId: saved.id,
      hash: deckListHash(spellbookDeck(detail.entries)),
      signals: { gameChangers: [], massLandDenial: ['Armageddon'], extraTurns: [], combos: [] },
    });
    detail = await getDeck(db, { deckId: saved.id, viewerId: owner.id });
    expect(detail.analysisStale).toBe(false);
    expect(detail.updatedAt).toEqual(before);
    expect(detail.bracket).toMatchObject({ minimum: 4, source: 'spellbook' });
    expect(detail.analysis.rolesTagged).toEqual({ tagged: 2, total: 2 });
    expect((await deckCardsForEnrichment(db, saved.id)).staleRoles).toEqual([]);
  });
});

describe('edições da mesma carta', () => {
  const sol = (id: string, set: string, number: string) =>
    mapScryfallCard({
      id,
      name: 'Sol Ring',
      cmc: 1,
      mana_cost: '{1}',
      type_line: 'Artifact',
      color_identity: [],
      set,
      set_name: set.toUpperCase(),
      collector_number: number,
    });

  it('importa, mostra e troca a edição de parte das cópias', async () => {
    const { moveLinePrint, setDeckLine } = await import('./decks');
    const owner = await createTestUser(db, { name: 'Edições' });
    const cmm = sol('sol-cmm', 'cmm', '400');
    const lea = sol('sol-lea', 'lea', '270');
    const saved = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'Prints',
        source: 'text',
        entries: [
          {
            name: 'Sol Ring',
            quantity: 2,
            board: 'mainboard',
            setCode: 'cmm',
            collectorNumber: '400',
          },
          {
            name: 'Sol Ring',
            quantity: 1,
            board: 'mainboard',
            isProxy: true,
            setCode: 'cmm',
            collectorNumber: '400',
          },
          {
            name: 'Sol Ring',
            quantity: 1,
            board: 'mainboard',
            setCode: 'lea',
            collectorNumber: '270',
          },
        ],
      },
      cards: [cmm, lea],
      format: 'other',
    });
    const lines = async () =>
      (await getDeck(db, { deckId: saved.id, viewerId: owner.id })).lines
        .map((l) => [l.scryfallId, l.quantity, l.proxies])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    expect(await lines()).toEqual([
      ['sol-cmm', 3, 1],
      ['sol-lea', 1, 0],
    ]);

    // Move 3 cópias da CMM (2 reais + 1 proxy) para a LEA.
    await moveLinePrint(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Sol Ring',
      fromScryfallId: 'sol-cmm',
      card: lea,
      quantity: 3,
    });
    expect(await lines()).toEqual([['sol-lea', 4, 1]]);

    await expect(
      moveLinePrint(db, {
        deckId: saved.id,
        userId: owner.id,
        board: 'mainboard',
        name: 'Sol Ring',
        fromScryfallId: 'sol-lea',
        card: cmm,
        quantity: 9,
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      moveLinePrint(db, {
        deckId: saved.id,
        userId: owner.id,
        board: 'mainboard',
        name: 'Arcane Signet',
        fromScryfallId: 'sol-lea',
        card: cmm,
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    // Editar a quantidade de uma edição não mexe nas outras.
    await moveLinePrint(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Sol Ring',
      fromScryfallId: 'sol-lea',
      card: cmm,
      quantity: 1,
    });
    await setDeckLine(db, {
      deckId: saved.id,
      userId: owner.id,
      board: 'mainboard',
      name: 'Sol Ring',
      quantity: 2,
      proxies: 0,
      card: lea,
      scryfallId: 'sol-lea',
    });
    expect(await lines()).toEqual([
      ['sol-cmm', 1, 0],
      ['sol-lea', 2, 0],
    ]);
  });
});

describe('adicionar cópias', () => {
  const mountain = (id: string, set: string) =>
    mapScryfallCard({
      id,
      name: 'Mountain',
      cmc: 0,
      type_line: 'Basic Land — Mountain',
      color_identity: ['R'],
      set,
      set_name: set.toUpperCase(),
      collector_number: '1',
    });

  it('cópias novas entram na impressão padrão, sem somar com uma edição trocada', async () => {
    const { addDeckCopies, moveLinePrint } = await import('./decks');
    const owner = await createTestUser(db, { name: 'Montanhas' });
    const padrao = mountain('mtn-fdn', 'fdn');
    const unf = mountain('mtn-unf', 'unf');
    const saved = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'Mono R',
        source: 'text',
        entries: [{ name: 'Lightning Bolt', quantity: 1, board: 'mainboard' }],
      },
      cards: [],
      format: 'other',
    });
    const base = { deckId: saved.id, userId: owner.id, board: 'mainboard' as const };
    const lines = async () =>
      (await getDeck(db, { deckId: saved.id, viewerId: owner.id })).lines
        .filter((l) => l.name !== 'Lightning Bolt')
        .map((l) => [l.scryfallId, l.quantity, l.proxies])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    // 3 montanhas na edição padrão; a pessoa troca a edição delas.
    await addDeckCopies(db, { ...base, name: 'Mountain', quantity: 3, proxies: 0, card: padrao });
    await moveLinePrint(db, {
      ...base,
      name: 'Mountain',
      fromScryfallId: 'mtn-fdn',
      card: unf,
      quantity: 3,
    });
    // Mais 3: viram uma pilha nova (padrão), separada das que mudaram de edição.
    await addDeckCopies(db, { ...base, name: 'Mountain', quantity: 3, proxies: 1, card: padrao });
    expect(await lines()).toEqual([
      ['mtn-fdn', 3, 1],
      ['mtn-unf', 3, 0],
    ]);
    // Mais 2 na padrão: somam com a pilha da mesma impressão.
    await addDeckCopies(db, { ...base, name: 'Mountain', quantity: 2, proxies: 0, card: padrao });
    expect(await lines()).toEqual([
      ['mtn-fdn', 5, 1],
      ['mtn-unf', 3, 0],
    ]);
    // Carta desconhecida (sem dados do Scryfall) entra sem impressão.
    await addDeckCopies(db, { ...base, name: 'Carta Nova', quantity: 1, proxies: 0, card: null });
    expect((await lines()).find((l) => l[0] === null)).toEqual([null, 1, 0]);

    await expect(
      addDeckCopies(db, { ...base, name: 'Mountain', quantity: 0, proxies: 0, card: padrao }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      addDeckCopies(db, { ...base, name: ' ', quantity: 1, proxies: 0, card: null }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('comparação com decks do mesmo comandante', () => {
  it('usa só decks visíveis com o mesmo conjunto de comandantes', async () => {
    const { compareWithCommanderDecks, updateDeck } = await import('./decks');
    const { players } = await seedGroup(db, 2);
    const [ana, bia] = players;
    const stranger = await createTestUser(db, { name: 'Estranho' });
    const card = (id: string, name: string, type = 'Artifact') =>
      mapScryfallCard({ id, name, cmc: 2, type_line: type, color_identity: [] });
    const cardsList = [
      card('cmp-omnath', 'Omnath, Locus of Mana', 'Legendary Creature'),
      card('cmp-signet', 'Arcane Signet'),
      card('cmp-mine', 'Minha Carta'),
      card('cmp-other', 'Outra Carta'),
    ];
    const save = (ownerId: string, main: string[], name = 'Omnath') =>
      saveImportedDeck(db, {
        ownerId,
        cards: cardsList,
        deck: {
          name,
          source: 'text',
          entries: [
            { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander' },
            ...main.map((n) => ({ name: n, quantity: 1, board: 'mainboard' as const })),
          ],
        },
      });
    const mine = await save(ana!.id, ['Minha Carta']);
    await save(bia!.id, ['Arcane Signet', 'Outra Carta']);
    const hidden = await save(bia!.id, ['Outra Carta']);
    await updateDeck(db, { deckId: hidden.id, userId: bia!.id, visibility: 'private' });
    await save(stranger.id, ['Arcane Signet']); // grupo de quem não divide grupo: não entra
    const pub = await save(stranger.id, ['Arcane Signet'], 'Público');
    await updateDeck(db, { deckId: pub.id, userId: stranger.id, visibility: 'public' });

    const detail = await getDeck(db, { deckId: mine.id, viewerId: ana!.id });
    const result = await compareWithCommanderDecks(db, {
      deckId: mine.id,
      viewerId: ana!.id,
      format: detail.format,
      commanders: detail.analysis.commanders,
      entries: detail.entries,
    });
    expect(result?.decks).toBe(2);
    expect(result?.commonMissing).toEqual([
      { name: 'Arcane Signet', share: 1 },
      { name: 'Outra Carta', share: 0.5 },
    ]);
    expect(result?.unique).toEqual(['Minha Carta']);
    expect(
      await compareWithCommanderDecks(db, {
        deckId: mine.id,
        viewerId: ana!.id,
        format: 'commander',
        commanders: [],
        entries: [],
      }),
    ).toBeNull();
  });
});
