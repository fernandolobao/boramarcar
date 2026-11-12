import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { seedGroup } from '../test/helpers';
import { createTestDb, createTestUser } from '../testing';
import { saveImportedDeck } from './decks';
import { createEvent, recordGame, setRsvp, updateEvent } from './events';
import { joinGroup } from './groups';
import { claimEventRecap, getEventRecap } from './recap';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('resumo da noite (8.6)', () => {
  it('só com encontro finalizado e partida; primeiros nomes, comandantes e placar; envio único', async () => {
    const { group, players } = await seedGroup(db, 3);
    const [a, b, c] = players.map((p) => p.id) as [string, string, string];
    // Dois "Ana": ganham a inicial do sobrenome.
    const ana1 = await createTestUser(db, { name: 'Ana Souza' });
    const ana2 = await createTestUser(db, { name: 'Ana Lima' });
    for (const u of [ana1, ana2])
      await joinGroup(db, { inviteCode: group.inviteCode, userId: u.id });

    const event = await createEvent(db, {
      groupId: group.id,
      userId: a,
      title: 'Commander de sexta',
      startsAt: new Date('2026-11-13T22:00:00Z'),
      participantIds: [b, c, ana1.id, ana2.id],
    });
    await setRsvp(db, { eventId: event.id, userId: c, rsvp: 'yes' });

    expect(await getEventRecap(db, event.id)).toBeNull();
    await updateEvent(db, { eventId: event.id, userId: a, status: 'finished' });
    // Finalizado, mas sem partida: nada a resumir.
    expect(await getEventRecap(db, event.id)).toBeNull();

    const deck = await saveImportedDeck(db, {
      ownerId: ana1.id,
      deck: {
        name: 'Omnath',
        source: 'text',
        entries: [{ name: 'Omnath, Locus of Mana', quantity: 1, board: 'commander' }],
      },
      cards: [],
    });
    await recordGame(db, {
      eventId: event.id,
      userId: a,
      players: [
        { userId: ana1.id, result: 'win', deckId: deck.id },
        { userId: ana2.id, result: 'loss' },
        { userId: a, result: 'loss' },
      ],
    });
    await recordGame(db, {
      eventId: event.id,
      userId: a,
      players: [
        { userId: ana1.id, result: 'win', deckId: deck.id },
        { userId: a, result: 'loss' },
        { userId: b, result: 'loss' },
      ],
    });

    const recap = (await getEventRecap(db, event.id))!;
    expect(recap.title).toBe('Commander de sexta');
    expect(recap.games[0]).toMatchObject({
      number: 1,
      winners: ['Ana S.'],
      players: [
        { name: 'Ana S.', commanders: ['Omnath, Locus of Mana'], result: 'win' },
        { name: 'Ana L.', commanders: [], result: 'loss' },
        { name: 'P1', commanders: [], result: 'loss' },
      ],
    });
    expect(recap.standings[0]).toEqual({ name: 'Ana S.', wins: 2, games: 2 });
    expect(JSON.stringify(recap)).not.toMatch(/Souza|Lima|@/);

    const claimed = await claimEventRecap(db, event.id);
    expect(claimed?.groupName).toBe('Mesa de Quinta');
    expect(new Set(claimed?.userIds)).toEqual(new Set([ana1.id, ana2.id, a, b, c]));
    expect(await claimEventRecap(db, event.id)).toBeNull();
  });
});
