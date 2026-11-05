import { DomainError, validateGameResult, type GamePlayerResult } from '@boramarcar/core';
import { and, asc, desc, eq, gte, inArray, lt, max } from 'drizzle-orm';
import type { Database } from '../client';
import {
  decks,
  eventParticipants,
  events,
  gamePlayers,
  games,
  groupMembers,
  locations,
  user,
} from '../schema';
import { requireMembership } from './groups';

type RsvpStatus = (typeof eventParticipants.$inferSelect)['rsvp'];

async function assertAllMembers(db: Database, groupId: string, userIds: string[]) {
  if (!userIds.length) return;
  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.userId, userIds)));
  if (rows.length !== new Set(userIds).size) {
    throw new DomainError('invalid_input', 'Todos os jogadores precisam participar do grupo');
  }
}

export interface CreateEventInput {
  groupId: string;
  userId: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  locationId?: string | null;
  participantIds?: string[];
}

export async function createEvent(db: Database, input: CreateEventInput) {
  await requireMembership(db, input.groupId, input.userId);
  const title = input.title.trim();
  if (!title) throw new DomainError('invalid_input', 'Informe um título');
  if (input.endsAt && input.endsAt <= input.startsAt) {
    throw new DomainError('invalid_input', 'O fim deve ser depois do início');
  }
  if (input.locationId) {
    const [location] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, input.locationId), eq(locations.groupId, input.groupId)));
    if (!location) throw new DomainError('invalid_input', 'Local inválido para este grupo');
  }
  const participantIds = [...new Set([input.userId, ...(input.participantIds ?? [])])];
  await assertAllMembers(db, input.groupId, participantIds);

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        groupId: input.groupId,
        title,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        locationId: input.locationId ?? null,
        createdBy: input.userId,
      })
      .returning();
    await tx
      .insert(eventParticipants)
      .values(
        participantIds.map((userId) => ({ eventId: event!.id, userId, rsvp: 'yes' as const })),
      );
    return event!;
  });
}

export async function listEvents(
  db: Database,
  input: { groupId: string; userId: string; when?: 'upcoming' | 'past'; now?: Date },
) {
  await requireMembership(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const timeFilter =
    input.when === 'past'
      ? lt(events.startsAt, now)
      : input.when === 'upcoming'
        ? gte(events.startsAt, now)
        : undefined;
  return db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
      locationId: events.locationId,
      locationName: locations.name,
    })
    .from(events)
    .leftJoin(locations, eq(locations.id, events.locationId))
    .where(and(eq(events.groupId, input.groupId), timeFilter))
    .orderBy(input.when === 'past' ? desc(events.startsAt) : asc(events.startsAt));
}

async function requireEvent(db: Database, eventId: string, userId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new DomainError('not_found', 'Evento não encontrado');
  const membership = await requireMembership(db, event.groupId, userId);
  return { event, role: membership.role };
}

export async function getEventDetail(db: Database, input: { eventId: string; userId: string }) {
  const { event } = await requireEvent(db, input.eventId, input.userId);
  const [location] = event.locationId
    ? await db.select().from(locations).where(eq(locations.id, event.locationId))
    : [];

  const participants = await db
    .select({ userId: user.id, name: user.name, image: user.image, rsvp: eventParticipants.rsvp })
    .from(eventParticipants)
    .innerJoin(user, eq(user.id, eventParticipants.userId))
    .where(eq(eventParticipants.eventId, event.id))
    .orderBy(asc(user.name));

  const gameRows = await db
    .select()
    .from(games)
    .where(eq(games.eventId, event.id))
    .orderBy(asc(games.number));
  const playerRows = gameRows.length
    ? await db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          name: user.name,
          result: gamePlayers.result,
          seat: gamePlayers.seat,
          deckId: gamePlayers.deckId,
          deckName: decks.name,
        })
        .from(gamePlayers)
        .innerJoin(user, eq(user.id, gamePlayers.userId))
        .leftJoin(decks, eq(decks.id, gamePlayers.deckId))
        .where(
          inArray(
            gamePlayers.gameId,
            gameRows.map((g) => g.id),
          ),
        )
    : [];

  return {
    ...event,
    location: location ?? null,
    participants,
    games: gameRows.map((game) => {
      const players = playerRows
        .filter((p) => p.gameId === game.id)
        .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99) || a.name.localeCompare(b.name));
      return {
        ...game,
        players,
        winner: players.find((p) => p.result === 'win') ?? null,
        isDraw: players.every((p) => p.result !== 'win'),
      };
    }),
  };
}

export async function setRsvp(
  db: Database,
  input: { eventId: string; userId: string; rsvp: RsvpStatus },
) {
  await requireEvent(db, input.eventId, input.userId);
  await db
    .insert(eventParticipants)
    .values({ eventId: input.eventId, userId: input.userId, rsvp: input.rsvp })
    .onConflictDoUpdate({
      target: [eventParticipants.eventId, eventParticipants.userId],
      set: { rsvp: input.rsvp, updatedAt: new Date() },
    });
}

export interface RecordGameInput {
  eventId: string;
  userId: string;
  players: (GamePlayerResult & { seat?: number | null })[];
  playedAt?: Date;
  notes?: string | null;
}

export async function recordGame(db: Database, input: RecordGameInput) {
  validateGameResult(input.players);
  const { event } = await requireEvent(db, input.eventId, input.userId);
  if (event.status === 'cancelled') throw new DomainError('conflict', 'Evento cancelado');
  await assertAllMembers(
    db,
    event.groupId,
    input.players.map((p) => p.userId),
  );

  const deckChecks = input.players.filter((p) => p.deckId);
  if (deckChecks.length) {
    const owned = await db
      .select({ id: decks.id, ownerId: decks.ownerId })
      .from(decks)
      .where(
        inArray(
          decks.id,
          deckChecks.map((p) => p.deckId!),
        ),
      );
    for (const player of deckChecks) {
      const deck = owned.find((d) => d.id === player.deckId);
      if (!deck || deck.ownerId !== player.userId) {
        throw new DomainError('invalid_input', 'O deck informado não pertence ao jogador');
      }
    }
  }

  return db.transaction(async (tx) => {
    const [{ value: lastNumber } = { value: 0 }] = await tx
      .select({ value: max(games.number) })
      .from(games)
      .where(eq(games.eventId, event.id));
    const [game] = await tx
      .insert(games)
      .values({
        eventId: event.id,
        groupId: event.groupId,
        number: (lastNumber ?? 0) + 1,
        playedAt: input.playedAt ?? new Date(),
        notes: input.notes?.trim() || null,
        createdBy: input.userId,
      })
      .returning();
    await tx.insert(gamePlayers).values(
      input.players.map((p) => ({
        gameId: game!.id,
        userId: p.userId,
        result: p.result,
        deckId: p.deckId ?? null,
        seat: p.seat ?? null,
      })),
    );
    return game!;
  });
}

export async function deleteGame(db: Database, input: { gameId: string; userId: string }) {
  const [game] = await db.select().from(games).where(eq(games.id, input.gameId)).limit(1);
  if (!game) throw new DomainError('not_found', 'Partida não encontrada');
  const membership = await requireMembership(db, game.groupId, input.userId);
  if (game.createdBy !== input.userId && membership.role === 'member') {
    throw new DomainError('forbidden', 'Só quem registrou ou um admin pode remover a partida');
  }
  await db.delete(games).where(eq(games.id, game.id));
}
