import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { createTestDb, createTestUser } from '../testing';
import { seedGroup } from '../test/helpers';
import { saveImportedDeck } from './decks';
import {
  createEvent,
  deleteGame,
  getEventDetail,
  listEvents,
  recordGame,
  setRsvp,
  updateEvent,
} from './events';
import { createLocation } from './groups';
import { getGroupRanking } from './ranking';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe('eventos, partidas e ranking', () => {
  it('fluxo completo: cria evento, registra partidas e calcula o ranking', async () => {
    const { group, players, owner } = await seedGroup(db, 4);
    const [p1, p2, p3, p4] = players.map((p) => p.id) as [string, string, string, string];
    const location = await createLocation(db, {
      groupId: group.id,
      userId: owner.id,
      name: 'Casa do P1',
    });

    const event = await createEvent(db, {
      groupId: group.id,
      userId: p1,
      title: 'Commander de sábado',
      startsAt: new Date('2026-11-14T19:00:00Z'),
      locationId: location.id,
      participantIds: [p2, p3, p4],
    });

    const deck = await saveImportedDeck(db, {
      ownerId: p1,
      deck: {
        name: 'Omnath',
        source: 'text',
        entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard' }],
      },
      cards: [],
    });

    await recordGame(db, {
      eventId: event.id,
      userId: p1,
      players: [
        { userId: p1, result: 'win', deckId: deck.id, seat: 1 },
        { userId: p2, result: 'loss', seat: 2 },
        { userId: p3, result: 'loss', seat: 3 },
        { userId: p4, result: 'loss', seat: 4 },
      ],
    });
    await recordGame(db, {
      eventId: event.id,
      userId: p2,
      players: [p1, p2, p3, p4].map((userId) => ({ userId, result: 'draw' as const })),
      notes: 'Empate por combo de todo mundo',
    });

    const detail = await getEventDetail(db, { eventId: event.id, userId: p3 });
    expect(detail.location?.name).toBe('Casa do P1');
    expect(detail.participants).toHaveLength(4);
    expect(detail.games.map((g) => [g.number, g.winner?.userId ?? null, g.isDraw])).toEqual([
      [1, p1, false],
      [2, null, true],
    ]);
    expect(detail.games[0]?.players[0]).toMatchObject({ userId: p1, deckName: 'Omnath' });

    const ranking = await getGroupRanking(db, { groupId: group.id, userId: p4 });
    expect(ranking.totalGames).toBe(2);
    expect(ranking.standings[0]).toMatchObject({
      userId: p1,
      wins: 1,
      draws: 1,
      points: 4,
      name: 'P1',
    });
    expect(ranking.standings.slice(1).every((s) => s.points === 1 && s.position === 2)).toBe(true);

    const filtered = await getGroupRanking(db, {
      groupId: group.id,
      userId: p4,
      from: new Date('2099-01-01'),
    });
    expect(filtered.standings).toEqual([]);
  });

  it('valida partidas e permissões', async () => {
    const { group, players } = await seedGroup(db, 3);
    const [p1, p2, p3] = players.map((p) => p.id) as [string, string, string];
    const outsider = await createTestUser(db);
    const event = await createEvent(db, {
      groupId: group.id,
      userId: p1,
      title: 'Teste',
      startsAt: new Date(),
    });

    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: p1,
        players: [
          { userId: p1, result: 'win' },
          { userId: p2, result: 'win' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: p1,
        players: [
          { userId: p1, result: 'win' },
          { userId: outsider.id, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: outsider.id,
        players: [
          { userId: p1, result: 'win' },
          { userId: p2, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const othersDeck = await saveImportedDeck(db, {
      ownerId: p2,
      deck: {
        name: 'Do P2',
        source: 'text',
        entries: [{ name: 'Sol Ring', quantity: 1, board: 'mainboard' }],
      },
      cards: [],
    });
    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: p1,
        players: [
          { userId: p1, result: 'win', deckId: othersDeck.id },
          { userId: p2, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });

    const game = await recordGame(db, {
      eventId: event.id,
      userId: p2,
      players: [
        { userId: p1, result: 'win' },
        { userId: p2, result: 'loss' },
      ],
    });
    await expect(deleteGame(db, { gameId: game.id, userId: p3 })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await deleteGame(db, { gameId: game.id, userId: p1 }); // dono do grupo
    expect((await getEventDetail(db, { eventId: event.id, userId: p1 })).games).toEqual([]);
  });

  it('lista eventos futuros/passados e atualiza RSVP', async () => {
    const { group, players } = await seedGroup(db, 2);
    const [p1, p2] = players.map((p) => p.id) as [string, string];
    const now = new Date('2026-11-10T12:00:00Z');
    await createEvent(db, {
      groupId: group.id,
      userId: p1,
      title: 'Passado',
      startsAt: new Date('2026-11-01T19:00:00Z'),
    });
    const future = await createEvent(db, {
      groupId: group.id,
      userId: p1,
      title: 'Futuro',
      startsAt: new Date('2026-11-20T19:00:00Z'),
    });

    expect(
      (await listEvents(db, { groupId: group.id, userId: p2, when: 'upcoming', now })).map(
        (e) => e.title,
      ),
    ).toEqual(['Futuro']);
    expect(
      (await listEvents(db, { groupId: group.id, userId: p2, when: 'past', now })).map(
        (e) => e.title,
      ),
    ).toEqual(['Passado']);

    await setRsvp(db, { eventId: future.id, userId: p2, rsvp: 'maybe' });
    await setRsvp(db, { eventId: future.id, userId: p2, rsvp: 'no' });
    const detail = await getEventDetail(db, { eventId: future.id, userId: p1 });
    expect(detail.participants.find((p) => p.userId === p2)?.rsvp).toBe('no');
  });

  it('rejeita dados inválidos ao criar evento', async () => {
    const { group, players } = await seedGroup(db, 1);
    const outsider = await createTestUser(db);
    const base = {
      groupId: group.id,
      userId: players[0]!.id,
      startsAt: new Date('2026-11-20T19:00:00Z'),
    };
    await expect(createEvent(db, { ...base, title: ' ' })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(
      createEvent(db, { ...base, title: 'x', endsAt: new Date('2026-11-20T18:00:00Z') }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createEvent(db, { ...base, title: 'x', locationId: 'nope' }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createEvent(db, { ...base, title: 'x', participantIds: [outsider.id] }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('edita, cancela, finaliza e reabre encontros com permissões', async () => {
    const { group, players, owner } = await seedGroup(db, 3);
    const [, creator, other] = players as [typeof owner, typeof owner, typeof owner];
    const location = await createLocation(db, {
      groupId: group.id,
      userId: owner.id,
      name: 'Loja',
    });
    const event = await createEvent(db, {
      groupId: group.id,
      userId: creator.id,
      title: 'Original',
      startsAt: new Date('2026-12-01T22:00:00Z'),
    });
    expect(event.sequence).toBe(0);

    await expect(
      updateEvent(db, { eventId: event.id, userId: other.id, title: 'x' }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
    expect((await getEventDetail(db, { eventId: event.id, userId: other.id })).canManage).toBe(
      false,
    );
    expect((await getEventDetail(db, { eventId: event.id, userId: owner.id })).canManage).toBe(
      true,
    );

    const edited = await updateEvent(db, {
      eventId: event.id,
      userId: creator.id,
      title: '  Remarcado ',
      startsAt: new Date('2026-12-02T22:00:00Z'),
      endsAt: new Date('2026-12-03T02:00:00Z'),
      locationId: location.id,
    });
    expect(edited).toMatchObject({ title: 'Remarcado', locationId: location.id, sequence: 1 });

    await expect(
      updateEvent(db, {
        eventId: event.id,
        userId: creator.id,
        startsAt: new Date('2026-12-03T03:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      updateEvent(db, { eventId: event.id, userId: creator.id, title: ' ' }),
    ).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(
      updateEvent(db, { eventId: event.id, userId: creator.id, locationId: 'x' }),
    ).rejects.toMatchObject({
      code: 'invalid_input',
    });

    // Dono do grupo pode cancelar; partidas ficam bloqueadas
    const cancelled = await updateEvent(db, {
      eventId: event.id,
      userId: owner.id,
      status: 'cancelled',
    });
    expect(cancelled).toMatchObject({ status: 'cancelled', sequence: 2 });
    await expect(
      recordGame(db, {
        eventId: event.id,
        userId: owner.id,
        players: [
          { userId: owner.id, result: 'win' },
          { userId: creator.id, result: 'loss' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'conflict' });

    const now = new Date('2026-11-20T00:00:00Z');
    expect(
      await listEvents(db, {
        groupId: group.id,
        userId: owner.id,
        when: 'upcoming',
        now,
        includeCancelled: false,
      }),
    ).toEqual([]);
    expect(
      await listEvents(db, { groupId: group.id, userId: owner.id, when: 'upcoming', now }),
    ).toHaveLength(1);

    const reopened = await updateEvent(db, {
      eventId: event.id,
      userId: creator.id,
      status: 'scheduled',
    });
    expect(reopened.status).toBe('scheduled');
    const finished = await updateEvent(db, {
      eventId: event.id,
      userId: creator.id,
      status: 'finished',
      locationId: null,
    });
    expect(finished).toMatchObject({ status: 'finished', locationId: null });

    // Sem mudanças não incrementa a sequência
    expect((await updateEvent(db, { eventId: event.id, userId: creator.id })).sequence).toBe(
      finished.sequence,
    );
  });
});
