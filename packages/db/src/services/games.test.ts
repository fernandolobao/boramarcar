import { mapScryfallCard } from '@boramarcar/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { addAvailability, suggestGameWindows } from './availability';
import { getDeckCovers, saveImportedDeck } from './decks';
import { createEvent, getEventDetail, recordGame, updateGame } from './events';
import { getGroupSettings, setMemberRole, updateGroupSettings } from './groups';
import { getGroupRanking } from './ranking';

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
  type_line: 'Legendary Creature — Elemental',
  color_identity: ['G'],
  image_uris: { normal: 'https://cards.scryfall.io/normal/front/o/m/omnath.jpg?1' },
});
const bolt = mapScryfallCard({
  id: 'bolt',
  name: 'Lightning Bolt',
  cmc: 1,
  type_line: 'Instant',
  color_identity: ['R'],
  image_uris: { normal: 'https://cards.scryfall.io/normal/front/b/o/bolt.jpg?1' },
});

describe('configurações do grupo', () => {
  it('lê, valida e altera (só dono/admin) e afeta as sugestões de horário', async () => {
    const { group, players, owner } = await seedGroup(db, 3);
    const member = players[1]!;
    expect(await getGroupSettings(db, { groupId: group.id, userId: member.id })).toEqual({
      tableSize: 4,
      minDurationMinutes: 120,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      defaultFormat: 'commander',
    });
    await expect(
      updateGroupSettings(db, { groupId: group.id, userId: member.id, tableSize: 3 }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      updateGroupSettings(db, { groupId: group.id, userId: owner.id, pointsWin: 1 }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    // Três jogadores não fecham a mesa padrão (4)…
    const start = new Date('2031-03-06T22:00:00Z');
    for (const p of players) {
      await addAvailability(db, {
        groupId: group.id,
        userId: p.id,
        startsAt: start,
        endsAt: new Date(start.getTime() + 3 * 3600_000),
      });
    }
    const range = { from: new Date('2031-03-01'), to: new Date('2031-03-31') };
    expect(await suggestGameWindows(db, { groupId: group.id, userId: owner.id, ...range })).toEqual(
      [],
    );
    // …mas fecham com mesa de 3.
    await setMemberRole(db, {
      groupId: group.id,
      actorId: owner.id,
      targetUserId: member.id,
      role: 'admin',
    });
    expect(
      await updateGroupSettings(db, {
        groupId: group.id,
        userId: member.id,
        tableSize: 3,
        pointsWin: 2,
        defaultFormat: 'standard',
      }),
    ).toMatchObject({ tableSize: 3, pointsWin: 2, pointsDraw: 1, defaultFormat: 'standard' });
    expect(
      await suggestGameWindows(db, { groupId: group.id, userId: owner.id, ...range }),
    ).toHaveLength(1);
  });
});

describe('partidas por tipo de jogo', () => {
  it('registra 2HG com times, duelo e detalhes; edita; ranking usa os pontos do grupo', async () => {
    const { group, players, owner } = await seedGroup(db, 4);
    const [a, b, c, d] = players.map((p) => p.id) as [string, string, string, string];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: a,
      title: 'Noite variada',
      startsAt: new Date(),
    });
    const deck = await saveImportedDeck(db, {
      ownerId: a,
      deck: {
        name: 'Omnath',
        source: 'text',
        entries: [
          { name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander', scryfallId: 'omnath' },
          { name: 'Lightning Bolt', quantity: 1, board: 'mainboard', scryfallId: 'bolt' },
        ],
      },
      cards: [omnath, bolt],
    });

    // Sem formato: usa o padrão do grupo (commander), com detalhes opcionais.
    const ffa = await recordGame(db, {
      eventId: event.id,
      userId: a,
      firstPlayerId: c,
      winningTurn: 8,
      durationMinutes: 95,
      players: [
        { userId: a, result: 'win', deckId: deck.id, seat: 1 },
        { userId: b, result: 'loss', eliminatedOrder: 2 },
        { userId: c, result: 'loss', eliminatedOrder: 1 },
        { userId: d, result: 'loss', eliminatedOrder: 3 },
      ],
    });
    expect(ffa).toMatchObject({ format: 'commander', winningTurn: 8, firstPlayerId: c });

    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: a,
        format: 'two_headed_giant',
        players: [
          { userId: a, team: 1, result: 'win' },
          { userId: b, team: 1, result: 'win' },
          { userId: c, team: 2, result: 'win' },
          { userId: d, team: 2, result: 'win' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    const thg = await recordGame(db, {
      eventId: event.id,
      userId: b,
      format: 'two_headed_giant',
      players: [
        { userId: a, team: 1, result: 'loss' },
        { userId: b, team: 2, result: 'win' },
        { userId: c, team: 1, result: 'loss' },
        { userId: d, team: 2, result: 'win' },
      ],
    });
    const duel = await recordGame(db, {
      eventId: event.id,
      userId: c,
      format: 'draft',
      players: [
        { userId: c, result: 'win', team: 1 }, // time é ignorado fora de formatos de time
        { userId: d, result: 'loss' },
      ],
    });

    const detail = await getEventDetail(db, { eventId: event.id, userId: c });
    expect(detail.games.map((g) => g.format)).toEqual(['commander', 'two_headed_giant', 'draft']);
    const [g1, g2, g3] = detail.games;
    expect(g1!.firstPlayerName).toBe('P3');
    expect(g1!.players.find((p) => p.userId === a)!.deck).toMatchObject({
      artUri: 'https://cards.scryfall.io/art_crop/front/o/m/omnath.jpg?1',
      colorIdentity: ['G'],
      cards: [{ name: 'Omnath, Locus of Mana' }],
    });
    expect(g2!.winners.map((w) => w.name)).toEqual(['P2', 'P4']);
    expect(g2!.winner).toBeNull();
    expect(g2!.players.map((p) => p.team)).toEqual([1, 1, 2, 2]);
    expect(g3!.players.every((p) => p.team === null)).toBe(true);
    expect(g1!.canEdit).toBe(false); // C não registrou e é membro comum
    expect(g3!.canEdit).toBe(true);

    // Edição (2.5): só quem registrou ou admin; troca resultado e detalhes.
    await expect(
      updateGame(db, {
        gameId: ffa.id,
        userId: c,
        players: [
          { userId: a, result: 'loss' },
          { userId: c, result: 'win' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const edited = await updateGame(db, {
      gameId: duel.id,
      userId: owner.id,
      winningTurn: 6,
      players: [
        { userId: c, result: 'loss' },
        { userId: d, result: 'win' },
      ],
    });
    expect(edited).toMatchObject({ format: 'draft', winningTurn: 6, number: 3 });
    await expect(
      updateGame(db, {
        gameId: thg.id,
        userId: b,
        players: [
          { userId: a, result: 'win' },
          { userId: b, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' }); // 2HG exige 4 jogadores

    await updateGroupSettings(db, { groupId: group.id, userId: owner.id, pointsWin: 5 });
    const ranking = await getGroupRanking(db, { groupId: group.id, userId: a });
    expect(ranking.points).toEqual({ win: 5, draw: 1, loss: 0 });
    expect(ranking.standings.find((s) => s.userId === d)).toMatchObject({ wins: 2, points: 10 });
    const commanderOnly = await getGroupRanking(db, {
      groupId: group.id,
      userId: a,
      format: 'commander',
    });
    expect(commanderOnly.totalGames).toBe(1);
  });
});

describe('capas de deck', () => {
  it('usa o comandante; sem comandante, a primeira carta com imagem', async () => {
    const { owner } = await seedGroup(db, 1);
    const noCommander = await saveImportedDeck(db, {
      ownerId: owner.id,
      deck: {
        name: 'Burn',
        source: 'text',
        entries: [{ name: 'Lightning Bolt', quantity: 4, board: 'mainboard', scryfallId: 'bolt' }],
      },
      cards: [bolt],
    });
    const covers = await getDeckCovers(db, [noCommander.id, 'inexistente']);
    expect(covers.get(noCommander.id)).toEqual({
      cards: [
        {
          name: 'Lightning Bolt',
          imageUri: 'https://cards.scryfall.io/normal/front/b/o/bolt.jpg?1',
          artUri: 'https://cards.scryfall.io/art_crop/front/b/o/bolt.jpg?1',
        },
      ],
      artUri: 'https://cards.scryfall.io/art_crop/front/b/o/bolt.jpg?1',
      colorIdentity: [],
    });
    expect(covers.get('inexistente')).toEqual({ cards: [], artUri: null, colorIdentity: [] });
    expect((await getDeckCovers(db, [])).size).toBe(0);
  });
});
