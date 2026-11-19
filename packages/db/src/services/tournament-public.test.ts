import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { createEvent } from './events';
import { joinGroup } from './groups';
import { addEntrant, createTournament, getPublicTournament, startTournament } from './tournaments';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('página pública do torneio', () => {
  it('só primeiros nomes (com a inicial quando repetem), sem grupo nem ids; nada antes de começar', async () => {
    const { group, owner } = await seedGroup(db, 1);
    const ana1 = await createTestUser(db, { name: 'Ana Souza' });
    const ana2 = await createTestUser(db, { name: 'Ana Lima' });
    const caio = await createTestUser(db, { name: 'Caio Prado Neto' });
    for (const u of [ana1, ana2, caio])
      await joinGroup(db, { inviteCode: group.inviteCode, userId: u.id });
    const event = await createEvent(db, {
      groupId: group.id,
      userId: owner.id,
      title: 'Noite da copa',
      startsAt: new Date('2026-11-20T22:00:00Z'),
    });
    const tournament = await createTournament(db, {
      eventId: event.id,
      userId: owner.id,
      name: 'Copa aberta',
      format: 'modern',
    });
    for (const u of [ana1, ana2, caio])
      await addEntrant(db, { tournamentId: tournament.id, userId: owner.id, memberIds: [u.id] });

    expect(await getPublicTournament(db, tournament.id)).toBeNull();
    await startTournament(db, { tournamentId: tournament.id, userId: owner.id });

    const view = (await getPublicTournament(db, tournament.id))!;
    expect(view.entrants.map((e) => e.name).sort()).toEqual(['Ana L.', 'Ana S.', 'Caio']);
    expect(view.entrants.every((e) => e.memberIds.length === 0)).toBe(true);
    expect(view.tournament).toMatchObject({
      name: 'Copa aberta',
      groupId: null,
      eventId: null,
      createdBy: null,
    });
    expect(view).toMatchObject({ canManage: false, myEntrantId: null });
    expect(view.event).toMatchObject({ title: 'Noite da copa' });
    expect(JSON.stringify(view)).not.toContain(group.id);
    expect(await getPublicTournament(db, 'nao-existe')).toBeNull();
  });
});
