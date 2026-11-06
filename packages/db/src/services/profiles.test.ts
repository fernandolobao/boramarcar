import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { getDeck, listDecksVisibleTo, saveImportedDeck, updateDeck } from './decks';
import { createEvent, recordGame } from './events';
import { getPlayerProfile } from './profiles';
import { createSeason } from './stats';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const deckOf = (ownerId: string, name: string) =>
  saveImportedDeck(db, {
    ownerId,
    deck: {
      name,
      source: 'text',
      entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard' }],
    },
    cards: [],
  });

describe('visibilidade dos decks', () => {
  it('privado só o dono; grupo quem divide grupo; público qualquer um', async () => {
    const { players } = await seedGroup(db, 2);
    const [owner, friend] = [players[0]!, players[1]!];
    const stranger = await createTestUser(db);
    const [priv, grp, pub] = await Promise.all([
      deckOf(owner.id, 'Privado'),
      deckOf(owner.id, 'Grupo'),
      deckOf(owner.id, 'Público'),
    ]);
    await updateDeck(db, { deckId: priv.id, userId: owner.id, visibility: 'private' });
    await updateDeck(db, { deckId: pub.id, userId: owner.id, visibility: 'public' });
    await expect(
      updateDeck(db, { deckId: pub.id, userId: owner.id, visibility: 'secreto' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    const can = async (deckId: string, viewerId: string) =>
      getDeck(db, { deckId, viewerId }).then(
        () => true,
        () => false,
      );
    expect(await Promise.all([priv, grp, pub].map((d) => can(d.id, owner.id)))).toEqual([
      true,
      true,
      true,
    ]);
    expect(await Promise.all([priv, grp, pub].map((d) => can(d.id, friend.id)))).toEqual([
      false,
      true,
      true,
    ]);
    expect(await Promise.all([priv, grp, pub].map((d) => can(d.id, stranger.id)))).toEqual([
      false,
      false,
      true,
    ]);
    expect((await getDeck(db, { deckId: pub.id, viewerId: stranger.id })).ownerName).toBe('P1');

    const names = async (viewerId: string) =>
      (await listDecksVisibleTo(db, { ownerId: owner.id, viewerId })).map((d) => d.name).sort();
    expect(await names(owner.id)).toEqual(['Grupo', 'Privado', 'Público']);
    expect(await names(friend.id)).toEqual(['Grupo', 'Público']);
    expect(await names(stranger.id)).toEqual(['Público']);
  });
});

describe('perfil do jogador', () => {
  it('visível para quem divide grupo, com conquistas, títulos e só o que pode ver', async () => {
    const { group, players, owner } = await seedGroup(db, 2);
    const other = players[1]!;
    const stranger = await createTestUser(db);
    const otherGroup = await seedGroup(db, 1);
    // Owner também está em outro grupo, que o colega não vê.
    const { joinGroup } = await import('./groups');
    await joinGroup(db, { inviteCode: otherGroup.group.inviteCode, userId: owner.id });

    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'X',
      startsAt: new Date(),
    });
    for (const [i, winner] of [owner.id, owner.id, owner.id].entries()) {
      await recordGame(db, {
        eventId: event.id,
        userId: owner.id,
        playedAt: new Date(Date.UTC(2026, 0, i + 2)),
        winningTurn: 5,
        players: [
          { userId: owner.id, result: winner === owner.id ? 'win' : 'loss' },
          { userId: other.id, result: winner === owner.id ? 'loss' : 'win' },
        ],
      });
    }
    await createSeason(db, {
      groupId: group.id,
      userId: owner.id,
      name: 'Verão',
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-02-01'),
    });
    await deckOf(owner.id, 'Do Dono');

    const seen = await getPlayerProfile(db, {
      userId: owner.id,
      viewerId: other.id,
      now: new Date('2026-03-01'),
    });
    expect(seen).toMatchObject({ name: 'P1', isSelf: false, email: null, games: 3, wins: 3 });
    expect(seen.groups.map((g) => g.id)).toEqual([group.id]);
    expect(seen.decks.map((d) => d.name)).toEqual(['Do Dono']);
    expect(seen.seasonTitles).toEqual([
      { seasonName: 'Verão', groupName: 'Mesa de Quinta', endsAt: new Date('2026-02-01') },
    ]);
    const a = Object.fromEntries(seen.achievements.map((x) => [x.id, x]));
    expect(a.first_win!.unlocked).toBe(true);
    expect(a.streak_3!.unlocked).toBe(true);
    expect(a.fast_win!.unlocked).toBe(true);
    expect(a.season_champion).toMatchObject({ unlocked: true, count: 1 });

    const self = await getPlayerProfile(db, { userId: owner.id, viewerId: owner.id });
    expect(self.email).toContain('@example.com');
    expect(self.groups).toHaveLength(2);
    await expect(
      getPlayerProfile(db, { userId: owner.id, viewerId: stranger.id }),
    ).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(
      getPlayerProfile(db, { userId: 'nope', viewerId: owner.id }),
    ).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
