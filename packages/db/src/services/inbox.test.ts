import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame } from './events';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
  notifyGameRecorded,
} from './inbox';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('central de notificações: partidas', () => {
  it('quem jogou recebe "partida registrada"; o resto do grupo, "partida no grupo"', async () => {
    const { group, players } = await seedGroup(db, 4);
    const [ana, bia, caio, duda] = players as [
      (typeof players)[0],
      (typeof players)[0],
      (typeof players)[0],
      (typeof players)[0],
    ];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Commander de quinta',
      startsAt: new Date('2026-11-12T22:00:00Z'),
    });
    const game = await recordGame(db, {
      eventId: event.id,
      userId: ana.id,
      playedAt: new Date('2026-11-12T23:00:00Z'),
      players: [
        { userId: ana.id, result: 'loss' },
        { userId: bia.id, result: 'win' },
        { userId: caio.id, result: 'loss' },
      ],
    });
    await notifyGameRecorded(db, { gameId: game.id, actorId: ana.id });

    // Quem registrou não recebe nada.
    expect(await listNotifications(db, { userId: ana.id })).toEqual([]);
    const [forBia] = await listNotifications(db, { userId: bia.id });
    expect(forBia).toMatchObject({
      kind: 'game',
      groupName: 'Mesa de Quinta',
      eventTitle: 'Commander de quinta',
      readAt: null,
      data: {
        kind: 'game',
        gameId: game.id,
        eventId: event.id,
        result: 'win',
        winnerIds: [bia.id],
      },
    });
    expect(forBia!.people[bia.id]).toBe('P2');
    const [forDuda] = await listNotifications(db, { userId: duda.id });
    expect(forDuda).toMatchObject({ kind: 'group_game', data: { winnerIds: [bia.id] } });

    expect(await countUnreadNotifications(db, { userId: caio.id })).toBe(1);
    await markNotificationsRead(db, { userId: caio.id });
    expect(await countUnreadNotifications(db, { userId: caio.id })).toBe(0);
    expect((await listNotifications(db, { userId: caio.id }))[0]!.readAt).toBeInstanceOf(Date);
    // Marcar as de uma pessoa não mexe nas dos outros.
    expect(await countUnreadNotifications(db, { userId: duda.id })).toBe(1);
  });
});
