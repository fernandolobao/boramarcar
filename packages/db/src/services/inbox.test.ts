import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame } from './events';
import {
  checkPodium,
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
  notifyAchievementsFromGame,
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

describe('central de notificações: conquistas e pódio', () => {
  it('conquista desbloqueada pela partida vira notificação, uma vez só', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [ana, bia] = players as [(typeof players)[0], (typeof players)[0]];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Noite',
      startsAt: new Date('2026-11-12T22:00:00Z'),
    });
    const play = async (day: number, winner: string) => {
      const game = await recordGame(db, {
        eventId: event.id,
        userId: ana.id,
        playedAt: new Date(Date.UTC(2026, 10, day)),
        players: [
          { userId: ana.id, result: winner === ana.id ? 'win' : 'loss' },
          { userId: bia.id, result: winner === bia.id ? 'win' : 'loss' },
        ],
      });
      await notifyAchievementsFromGame(db, { gameId: game.id });
      return game;
    };
    await play(1, ana.id);
    const achievements = async (userId: string) =>
      (await listNotifications(db, { userId }))
        .filter((n) => n.data.kind === 'achievement')
        .map((n) => (n.data.kind === 'achievement' ? n.data.achievementId : null))
        .sort();
    // Ana: estreia e primeira vitória; Bia: estreia.
    expect(await achievements(ana.id)).toEqual(['first_game', 'first_win']);
    expect(await achievements(bia.id)).toEqual(['first_game']);
    // Mais uma partida: nada novo para a Ana (e nada repetido).
    const second = await play(2, bia.id);
    expect(await achievements(ana.id)).toEqual(['first_game', 'first_win']);
    expect(await achievements(bia.id)).toEqual(['first_game', 'first_win']);
    // Rodar de novo para a mesma partida não duplica.
    await notifyAchievementsFromGame(db, { gameId: second.id });
    expect(await achievements(bia.id)).toEqual(['first_game', 'first_win']);
  });

  it('pódio: a primeira vez só guarda; depois, mudança no top 3 avisa o grupo', async () => {
    const { group, players } = await seedGroup(db, 3);
    const [ana, bia, caio] = players as [
      (typeof players)[0],
      (typeof players)[0],
      (typeof players)[0],
    ];
    const event = await createEvent(db, {
      groupId: group.id,
      userId: ana.id,
      title: 'Noite',
      startsAt: new Date('2026-11-12T22:00:00Z'),
    });
    const win = (winner: string, day: number) =>
      recordGame(db, {
        eventId: event.id,
        userId: ana.id,
        playedAt: new Date(Date.UTC(2026, 10, day)),
        players: [ana, bia, caio].map((p) => ({
          userId: p.id,
          result: p.id === winner ? ('win' as const) : ('loss' as const),
        })),
      });
    const podiums = async (userId: string) =>
      (await listNotifications(db, { userId }))
        .filter((n) => n.data.kind === 'podium')
        .map((n) => (n.data.kind === 'podium' ? n.data.userIds : []));

    await win(ana.id, 1);
    await checkPodium(db, { groupId: group.id, actorId: ana.id });
    expect(await podiums(caio.id)).toEqual([]);
    // Mesmo pódio: nada.
    await checkPodium(db, { groupId: group.id, actorId: ana.id });
    expect(await podiums(caio.id)).toEqual([]);
    // Bia vence duas: passa a Ana.
    await win(bia.id, 2);
    await win(bia.id, 3);
    await checkPodium(db, { groupId: group.id, actorId: ana.id });
    const [changed] = await podiums(caio.id);
    expect(changed![0]).toBe(bia.id);
    expect(changed![1]).toBe(ana.id);
    expect(await podiums(ana.id)).toHaveLength(1);
  });
});
