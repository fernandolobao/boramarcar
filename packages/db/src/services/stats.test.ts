import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { saveImportedDeck } from './decks';
import { createEvent, recordGame } from './events';
import { createSeason, deleteSeason, getGroupStats, listSeasons } from './stats';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('temporadas', () => {
  it('dono/admin cria e remove; membros listam; valida nome e datas', async () => {
    const { group, players, owner } = await seedGroup(db, 2);
    const member = players[1]!;
    const base = {
      groupId: group.id,
      name: '2º semestre',
      startsAt: new Date('2026-07-01T03:00:00Z'),
      endsAt: new Date('2027-01-01T03:00:00Z'),
    };
    await expect(createSeason(db, { ...base, userId: member.id })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(
      createSeason(db, { ...base, userId: owner.id, endsAt: base.startsAt }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createSeason(db, { ...base, userId: owner.id, name: ' x ' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    const season = await createSeason(db, { ...base, userId: owner.id, name: ' 2º semestre ' });
    expect(await listSeasons(db, { groupId: group.id, userId: member.id })).toEqual([
      { id: season.id, name: '2º semestre', startsAt: base.startsAt, endsAt: base.endsAt },
    ]);
    await expect(
      deleteSeason(db, { seasonId: season.id, userId: member.id }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await deleteSeason(db, { seasonId: season.id, userId: owner.id });
    expect(await listSeasons(db, { groupId: group.id, userId: owner.id })).toEqual([]);
    await expect(deleteSeason(db, { seasonId: season.id, userId: owner.id })).rejects.toMatchObject(
      { code: 'not_found' },
    );
  });
});

describe('estatísticas do grupo', () => {
  it('junta nomes, decks com capa, comandantes e filtra por período e tipo', async () => {
    const { group, players } = await seedGroup(db, 3);
    const [a, b, c] = players.map((p) => p.id) as [string, string, string];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: a,
      title: 'Stats',
      startsAt: new Date(),
    });
    const deck = await saveImportedDeck(db, {
      ownerId: a,
      deck: {
        name: 'Atraxa',
        source: 'text',
        entries: [{ name: "Atraxa, Praetors' Voice", quantity: 1, board: 'commander' }],
      },
      cards: [],
    });
    await recordGame(db, {
      eventId: event.id,
      userId: a,
      playedAt: new Date('2026-03-01T22:00:00Z'),
      firstPlayerId: a,
      winningTurn: 7,
      players: [
        { userId: a, result: 'win', deckId: deck.id, seat: 1 },
        { userId: b, result: 'loss', seat: 2, eliminatedOrder: 1 },
        { userId: c, result: 'loss', seat: 3, eliminatedOrder: 2 },
      ],
    });
    await recordGame(db, {
      eventId: event.id,
      userId: a,
      format: 'modern',
      playedAt: new Date('2026-09-01T22:00:00Z'),
      players: [
        { userId: b, result: 'win' },
        { userId: c, result: 'loss' },
      ],
    });

    const all = await getGroupStats(db, { groupId: group.id, userId: b });
    expect(all.totalGames).toBe(2);
    expect(all.formats).toEqual(['commander', 'modern']);
    expect(all.players.find((p) => p.userId === a)).toMatchObject({
      name: 'P1',
      wins: 1,
      winsFirst: 1,
    });
    expect(all.players.find((p) => p.userId === b)).toMatchObject({ firstOut: 1 });
    expect(all.headToHead.find((h) => h.userId === b && h.opponentId === c)).toMatchObject({
      name: 'P2',
      opponentName: 'P3',
      games: 2,
      wins: 1,
      losses: 0,
    });
    expect(all.decks).toEqual([
      expect.objectContaining({
        deckId: deck.id,
        name: 'Atraxa',
        ownerName: 'P1',
        games: 1,
        wins: 1,
      }),
    ]);
    expect(all.commanders).toEqual([
      {
        name: "Atraxa, Praetors' Voice",
        artUri: null,
        games: 1,
        wins: 1,
        players: [{ userId: a, name: 'P1' }],
        winRate: 1,
      },
    ]);
    expect(all.averageWinningTurn).toBe(7);

    const modern = await getGroupStats(db, { groupId: group.id, userId: b, format: 'modern' });
    expect(modern.totalGames).toBe(1);
    expect(modern.formats).toEqual(['commander', 'modern']);
    const firstHalf = await getGroupStats(db, {
      groupId: group.id,
      userId: b,
      from: new Date('2026-01-01'),
      to: new Date('2026-07-01'),
    });
    expect(firstHalf.totalGames).toBe(1);
    expect(firstHalf.decks).toHaveLength(1);
  });
});
