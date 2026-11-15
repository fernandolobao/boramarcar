import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent, recordGame, setRsvp, updateEvent } from './events';
import { leaveGroup, setMemberRole } from './groups';
import { getEventPairings, getGroupAttendance, listPartnerHints, nudgeMember } from './integration';

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

describe('quem anda sumido e chamar para o próximo', () => {
  async function setup() {
    const { group, players, owner } = await seedGroup(db, 3);
    const [, member, away] = players as [typeof owner, typeof owner, typeof owner];
    // Todos entraram há muito tempo (o seed cria agora; a regra dos 30 dias usa a entrada).
    const realNow = new Date();
    const later = new Date(realNow.getTime() + 60 * DAY);
    const past = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Passado',
      startsAt: new Date(realNow.getTime() + DAY),
    });
    await setRsvp(db, { eventId: past.id, userId: owner.id, rsvp: 'yes' });
    await setRsvp(db, { eventId: past.id, userId: member.id, rsvp: 'yes' });
    await recordGame(db, {
      eventId: past.id,
      userId: owner.id,
      playedAt: new Date(realNow.getTime() + DAY),
      players: [
        { userId: owner.id, result: 'win' },
        { userId: member.id, result: 'loss' },
      ],
    });
    const next = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Próximo',
      startsAt: new Date(later.getTime() + 2 * DAY),
    });
    return { group, owner, member, away, past, next, later };
  }

  it('só dono e admins veem a presença; a lista traz o próximo encontro e quem já foi chamado', async () => {
    const { group, owner, member, away, next, later } = await setup();
    await expect(
      getGroupAttendance(db, { groupId: group.id, userId: member.id, now: later }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const stranger = await createTestUser(db, { name: 'Fora' });
    await expect(
      getGroupAttendance(db, { groupId: group.id, userId: stranger.id, now: later }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    await nudgeMember(db, {
      groupId: group.id,
      actorId: owner.id,
      targetUserId: away.id,
      eventId: next.id,
      now: later,
    });
    const result = await getGroupAttendance(db, {
      groupId: group.id,
      userId: owner.id,
      now: later,
    });
    expect(result.nextEvent).toMatchObject({ id: next.id, title: 'Próximo' });
    expect(result.nudged).toEqual([away.id]);
    // Quem cria o encontro já entra confirmado.
    expect(result.confirmedNext).toEqual([owner.id]);
    await setRsvp(db, { eventId: next.id, userId: member.id, rsvp: 'yes' });
    expect(
      (await getGroupAttendance(db, { groupId: group.id, userId: owner.id, now: later }))
        .confirmedNext,
    ).toEqual(expect.arrayContaining([owner.id, member.id]));
    const by = Object.fromEntries(result.members.map((m) => [m.userId, m]));
    expect(by[member.id]).toMatchObject({ attended: 1, of: 1 });
    expect(by[member.id]!.lastGameAt).toBeInstanceOf(Date);
    expect(by[away.id]!.lastGameAt).toBeNull();
    expect(by[away.id]).toMatchObject({ attended: 0, of: 1 });
    // Admin também vê.
    await setMemberRole(db, {
      groupId: group.id,
      actorId: owner.id,
      targetUserId: member.id,
      role: 'admin',
    });
    await expect(
      getGroupAttendance(db, { groupId: group.id, userId: member.id, now: later }),
    ).resolves.toBeTruthy();
  });

  it('quem jogou uma partida do encontro conta como presente, mesmo sem ter confirmado', async () => {
    const { group, owner, away, past, later } = await setup();
    await recordGame(db, {
      eventId: past.id,
      userId: owner.id,
      playedAt: new Date(past.startsAt.getTime() + 3600_000),
      players: [
        { userId: owner.id, result: 'loss' },
        { userId: away.id, result: 'win' },
      ],
    });
    const result = await getGroupAttendance(db, {
      groupId: group.id,
      userId: owner.id,
      now: later,
    });
    const row = result.members.find((m) => m.userId === away.id)!;
    expect(row).toMatchObject({ attended: 1, of: 1 });
  });

  it('chama uma vez por pessoa por encontro, só para encontro marcado e futuro do grupo', async () => {
    const { group, owner, member, away, past, next, later } = await setup();
    const call = (over: Partial<Parameters<typeof nudgeMember>[1]> = {}) =>
      nudgeMember(db, {
        groupId: group.id,
        actorId: owner.id,
        targetUserId: away.id,
        eventId: next.id,
        now: later,
        ...over,
      });
    await expect(call({ actorId: member.id })).rejects.toMatchObject({ code: 'forbidden' });
    await call();
    await expect(call()).rejects.toMatchObject({ code: 'conflict' });
    // Encontro que já passou.
    await expect(call({ eventId: past.id, targetUserId: member.id })).rejects.toMatchObject({
      code: 'not_found',
    });
    // Encontro de outro grupo.
    const other = await seedGroup(db, 1);
    const foreign = await createEvent(db, {
      groupId: other.group.id,
      userId: other.owner.id,
      title: 'Outro',
      startsAt: new Date(later.getTime() + 5 * DAY),
    });
    await expect(call({ eventId: foreign.id, targetUserId: member.id })).rejects.toMatchObject({
      code: 'not_found',
    });
    // Quem não é do grupo.
    await expect(call({ targetUserId: other.owner.id })).rejects.toMatchObject({
      code: 'not_found',
    });
    // Encontro cancelado.
    await updateEvent(db, { eventId: next.id, userId: owner.id, status: 'cancelled' });
    await expect(call({ targetUserId: member.id })).rejects.toMatchObject({ code: 'not_found' });
  });
});
