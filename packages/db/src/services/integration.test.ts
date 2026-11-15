import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame, setRsvp } from './events';
import { leaveGroup } from './groups';
import { getEventPairings, listPartnerHints } from './integration';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const DAY = 24 * 3600_000;
const now = new Date('2026-11-15T12:00:00Z');

describe('getEventPairings', () => {
  it('conta as partidas de cada dupla de confirmados, recentes e antigas', async () => {
    const { group, players, owner } = await seedGroup(db, 5);
    const [p1, p2, p3, p4, p5] = players as [
      typeof owner,
      typeof owner,
      typeof owner,
      typeof owner,
      typeof owner,
    ];
    const past = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Antigo',
      startsAt: new Date(now.getTime() - 300 * DAY),
    });
    const game = (playedAt: Date, ids: string[]) =>
      recordGame(db, {
        eventId: past.id,
        userId: owner.id,
        playedAt,
        players: ids.map((userId, i) => ({ userId, result: i === 0 ? 'win' : 'loss' })),
      });
    await game(new Date(now.getTime() - 10 * DAY), [p1.id, p2.id, p3.id]);
    await game(new Date(now.getTime() - 200 * DAY), [p1.id, p2.id]);

    const next = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Quinta',
      startsAt: new Date(now.getTime() + 3 * DAY),
    });
    await setRsvp(db, { eventId: next.id, userId: p1.id, rsvp: 'yes' });
    await setRsvp(db, { eventId: next.id, userId: p2.id, rsvp: 'yes' });
    await setRsvp(db, { eventId: next.id, userId: p3.id, rsvp: 'yes' });
    await setRsvp(db, { eventId: next.id, userId: p4.id, rsvp: 'no' });
    await setRsvp(db, { eventId: next.id, userId: p5.id, rsvp: 'yes' });
    await leaveGroup(db, { groupId: group.id, userId: p5.id });

    const result = await getEventPairings(db, { eventId: next.id, userId: p2.id, now });
    expect(result.format).toBe('commander');
    expect(result.players.map((p) => p.userId).sort()).toEqual([p1.id, p2.id, p3.id].sort());
    const find = (a: string, b: string) =>
      result.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
    expect(find(p1.id, p2.id)).toMatchObject({ recent: 1, older: 1 });
    expect(find(p1.id, p3.id)).toMatchObject({ recent: 1, older: 0 });
    expect(result.pairs.some((p) => [p.a, p.b].includes(p4.id) || [p.a, p.b].includes(p5.id))).toBe(
      false,
    );
  });

  it('quem não é do grupo não vê os pares', async () => {
    const { group, owner } = await seedGroup(db, 2);
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Quinta',
      startsAt: new Date(now.getTime() + DAY),
    });
    const stranger = await createTestUser(db, { name: 'Fora' });
    await expect(
      getEventPairings(db, { eventId: event.id, userId: stranger.id }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});

describe('listPartnerHints', () => {
  it('usa a última partida de cada um com você no grupo e os confirmados do próximo encontro', async () => {
    const { group, players, owner } = await seedGroup(db, 4);
    const [me, ana, bia, caio] = players as [
      typeof owner,
      typeof owner,
      typeof owner,
      typeof owner,
    ];
    const past = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Antigo',
      startsAt: new Date(now.getTime() - 300 * DAY),
    });
    const play = (playedAt: Date, ids: string[]) =>
      recordGame(db, {
        eventId: past.id,
        userId: owner.id,
        playedAt,
        players: ids.map((userId, i) => ({ userId, result: i === 0 ? 'win' : 'loss' })),
      });
    await play(new Date(now.getTime() - 100 * DAY), [me.id, ana.id]);
    await play(new Date(now.getTime() - 50 * DAY), [me.id, ana.id]);
    await play(new Date(now.getTime() - 5 * DAY), [me.id, bia.id]);
    // Partida sem você não conta.
    await play(new Date(now.getTime() - 2 * DAY), [ana.id, caio.id]);
    const next = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Quinta',
      startsAt: new Date(now.getTime() + 2 * DAY),
    });
    await setRsvp(db, { eventId: next.id, userId: ana.id, rsvp: 'yes' });

    const { hints } = await listPartnerHints(db, { groupId: group.id, userId: me.id, now });
    expect(hints.map((h) => h.userId)).toEqual([ana.id, caio.id]);
    expect(hints[0]!.lastPlayedAt).toEqual(new Date(now.getTime() - 50 * DAY));
    expect(hints[0]!.confirmedNext).toBe(true);
    expect(hints[1]).toMatchObject({ lastPlayedAt: null, confirmedNext: false });
  });

  it('quem não é do grupo não vê', async () => {
    const { group } = await seedGroup(db, 2);
    const stranger = await createTestUser(db, { name: 'Fora' });
    await expect(
      listPartnerHints(db, { groupId: group.id, userId: stranger.id }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
