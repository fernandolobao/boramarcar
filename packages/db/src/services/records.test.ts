import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame } from './events';
import { getGroupRecords } from './records';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('recordes do grupo (8.12)', () => {
  it('traz os recordes com nomes e encontros; quem não é do grupo não vê', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [ana, bia] = players as [(typeof players)[0], (typeof players)[0]];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Noite longa',
      startsAt: new Date('2026-11-12T22:00:00Z'),
    });
    for (const [turn, minutes] of [
      [7, 60],
      [4, 95],
    ] as const) {
      await recordGame(db, {
        eventId: event.id,
        userId: ana.id,
        winningTurn: turn,
        durationMinutes: minutes,
        players: [
          { userId: ana.id, result: 'win' },
          { userId: bia.id, result: 'loss' },
        ],
      });
    }
    const view = await getGroupRecords(db, { groupId: group.id, userId: bia.id });
    expect(view.totalGames).toBe(2);
    expect(view.records.fastestWin).toMatchObject({ turn: 4, winnerIds: [ana.id] });
    expect(view.records.longestGame).toMatchObject({ minutes: 95 });
    expect(view.records.longestStreak).toMatchObject({ userId: ana.id, length: 2 });
    expect(view.records.busiestNight).toMatchObject({ games: 2 });
    expect(view.people[ana.id]).toBe('P1');
    expect(view.eventTitles[event.id]).toBe('Noite longa');

    const stranger = await createTestUser(db);
    await expect(
      getGroupRecords(db, { groupId: group.id, userId: stranger.id }),
    ).rejects.toMatchObject({ code: expect.stringMatching(/forbidden|not_found/) });
  });
});
