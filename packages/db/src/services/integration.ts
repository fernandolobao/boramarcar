/**
 * Integração do grupo: dados para misturar a mesa e trazer de volta quem sumiu. As regras ficam
 * no core (`@boramarcar/core/integration`); aqui só as consultas.
 */
import { attendanceSummary, DomainError, partnerHints, type PairCount } from '@boramarcar/core';
import { and, asc, desc, eq, gt, inArray, lt, max, ne } from 'drizzle-orm';
import type { Database } from '../client';
import {
  eventNudges,
  eventParticipants,
  events,
  gamePlayers,
  games,
  groupMembers,
  groups,
  user,
} from '../schema';
import { requireEvent } from './events';
import { listMembers, requireMembership } from './groups';

const DAY = 24 * 3600_000;
/** Partidas dos últimos 90 dias contam como recentes (pesam mais na sugestão de mesas). */
export const RECENT_DAYS = 90;

/** Partidas que cada dupla da lista jogou junto no grupo, recentes e antigas. */
async function countPairs(db: Database, groupId: string, userIds: string[], now: Date) {
  if (userIds.length < 2) return [];
  const rows = await db
    .select({ gameId: gamePlayers.gameId, userId: gamePlayers.userId, playedAt: games.playedAt })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(and(eq(games.groupId, groupId), inArray(gamePlayers.userId, userIds)));
  const byGame = new Map<string, { playedAt: Date; ids: string[] }>();
  for (const row of rows) {
    const game = byGame.get(row.gameId) ?? { playedAt: row.playedAt, ids: [] };
    game.ids.push(row.userId);
    byGame.set(row.gameId, game);
  }
  const since = now.getTime() - RECENT_DAYS * DAY;
  const pairs = new Map<string, PairCount>();
  for (const { playedAt, ids } of byGame.values()) {
    const sorted = [...ids].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`;
        const pair = pairs.get(key) ?? { a: sorted[i]!, b: sorted[j]!, recent: 0, older: 0 };
        if (playedAt.getTime() >= since) pair.recent++;
        else pair.older++;
        pairs.set(key, pair);
      }
    }
  }
  return [...pairs.values()];
}

/**
 * Quem confirmou o encontro (e ainda é do grupo) e quantas vezes cada dupla já jogou junto,
 * para a sugestão de mesas. Só para membros do grupo do encontro.
 */
export async function getEventPairings(
  db: Database,
  input: { eventId: string; userId: string; now?: Date },
) {
  const { event } = await requireEvent(db, input.eventId, input.userId);
  const [group] = await db
    .select({ format: groups.defaultFormat })
    .from(groups)
    .where(eq(groups.id, event.groupId))
    .limit(1);
  const players = await db
    .select({ userId: user.id, name: user.name })
    .from(eventParticipants)
    .innerJoin(user, eq(user.id, eventParticipants.userId))
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.userId, user.id), eq(groupMembers.groupId, event.groupId)),
    )
    .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.rsvp, 'yes')))
    .orderBy(asc(user.name));
  const pairs = await countPairs(
    db,
    event.groupId,
    players.map((p) => p.userId),
    input.now ?? new Date(),
  );
  return { format: group?.format ?? 'commander', players, pairs };
}

/**
 * "Com quem você ainda não jogou" no painel: até 3 membros com quem a pessoa nunca jogou ou não
 * joga há 30+ dias, primeiro quem confirmou o próximo encontro marcado do grupo.
 */
export async function listPartnerHints(
  db: Database,
  input: { groupId: string; userId: string; now?: Date },
) {
  await requireMembership(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const members = await listMembers(db, input.groupId);

  // Partidas do grupo em que a pessoa jogou, com todos os jogadores de cada uma.
  const mine = db
    .select({ gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(and(eq(games.groupId, input.groupId), eq(gamePlayers.userId, input.userId)));
  const rows = await db
    .select({ userId: gamePlayers.userId, playedAt: games.playedAt })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(inArray(gamePlayers.gameId, mine));
  const lastPlayed: Record<string, Date> = {};
  for (const row of rows) {
    if (row.userId === input.userId) continue;
    const prev = lastPlayed[row.userId];
    if (!prev || row.playedAt > prev) lastPlayed[row.userId] = row.playedAt;
  }

  const [next] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.groupId, input.groupId),
        eq(events.status, 'scheduled'),
        gt(events.startsAt, now),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(1);
  const confirmedNext = next
    ? (
        await db
          .select({ userId: eventParticipants.userId })
          .from(eventParticipants)
          .where(and(eq(eventParticipants.eventId, next.id), eq(eventParticipants.rsvp, 'yes')))
      ).map((r) => r.userId)
    : [];

  const hints = partnerHints({
    viewerId: input.userId,
    members: members.map((m) => ({ userId: m.userId, name: m.name })),
    lastPlayed,
    confirmedNext,
    now,
  });
  return { hints: hints.map((h) => ({ ...h, confirmedNext: confirmedNext.includes(h.userId) })) };
}

/** Dono ou admin do grupo; membro comum recebe `forbidden`. */
async function requireManager(db: Database, groupId: string, userId: string) {
  const membership = await requireMembership(db, groupId, userId);
  if (membership.role === 'member') {
    throw new DomainError('forbidden', 'Só o dono ou um admin do grupo vê a presença');
  }
  return membership;
}

/** Próximo encontro marcado do grupo (o primeiro depois de `now`). */
async function nextScheduledEvent(db: Database, groupId: string, now: Date) {
  const [next] = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
    .from(events)
    .where(
      and(eq(events.groupId, groupId), eq(events.status, 'scheduled'), gt(events.startsAt, now)),
    )
    .orderBy(asc(events.startsAt))
    .limit(1);
  return next ?? null;
}

/**
 * "Quem anda sumido" (só dono e admins): presença de cada membro nos últimos 8 encontros que já
 * aconteceram, última partida, quem está sumido, o próximo encontro e quem já foi chamado para ele.
 */
export async function getGroupAttendance(
  db: Database,
  input: { groupId: string; userId: string; now?: Date },
) {
  await requireManager(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const members = await db
    .select({ userId: user.id, name: user.name, joinedAt: groupMembers.joinedAt })
    .from(groupMembers)
    .innerJoin(user, eq(user.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, input.groupId));

  const recent = await db
    .select({ id: events.id, startsAt: events.startsAt })
    .from(events)
    .where(
      and(
        eq(events.groupId, input.groupId),
        ne(events.status, 'cancelled'),
        lt(events.startsAt, now),
      ),
    )
    .orderBy(desc(events.startsAt))
    .limit(8);
  // Esteve no encontro: marcou "Vou" ou jogou alguma partida dele (muita gente só joga).
  const recentIds = recent.map((e) => e.id);
  const [confirmations, players] = recentIds.length
    ? await Promise.all([
        db
          .select({ eventId: eventParticipants.eventId, userId: eventParticipants.userId })
          .from(eventParticipants)
          .where(
            and(inArray(eventParticipants.eventId, recentIds), eq(eventParticipants.rsvp, 'yes')),
          ),
        db
          .select({ eventId: games.eventId, userId: gamePlayers.userId })
          .from(gamePlayers)
          .innerJoin(games, eq(games.id, gamePlayers.gameId))
          .where(inArray(games.eventId, recentIds)),
      ])
    : [[], []];
  const presence = [...confirmations, ...players];

  const lastGames = await db
    .select({ userId: gamePlayers.userId, at: max(games.playedAt) })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(eq(games.groupId, input.groupId))
    .groupBy(gamePlayers.userId);
  const lastGame = Object.fromEntries(lastGames.map((g) => [g.userId, g.at]));

  const nextEvent = await nextScheduledEvent(db, input.groupId, now);
  const nudged = nextEvent
    ? (
        await db
          .select({ userId: eventNudges.userId })
          .from(eventNudges)
          .where(eq(eventNudges.eventId, nextEvent.id))
      ).map((n) => n.userId)
    : [];
  // Quem já confirmou o próximo encontro não precisa ser chamado.
  const confirmedNext = nextEvent
    ? (
        await db
          .select({ userId: eventParticipants.userId })
          .from(eventParticipants)
          .where(
            and(eq(eventParticipants.eventId, nextEvent.id), eq(eventParticipants.rsvp, 'yes')),
          )
      ).map((r) => r.userId)
    : [];

  return {
    members: attendanceSummary({
      members,
      events: recent.map((e) => ({
        startsAt: e.startsAt,
        present: [...new Set(presence.filter((p) => p.eventId === e.id).map((p) => p.userId))],
      })),
      lastGame,
      now,
    }),
    nextEvent,
    nudged,
    confirmedNext,
  };
}

/**
 * "Chamar para o próximo": registra o chamado de um membro para um encontro marcado e futuro do
 * grupo (dono ou admin). Um por pessoa por encontro: repetir dá `conflict`. Quem chama manda o aviso.
 */
export async function nudgeMember(
  db: Database,
  input: { groupId: string; actorId: string; targetUserId: string; eventId: string; now?: Date },
) {
  await requireManager(db, input.groupId, input.actorId);
  const now = input.now ?? new Date();
  const [target] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)),
    )
    .limit(1);
  if (!target) throw new DomainError('not_found', 'Membro não encontrado');
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.id, input.eventId),
        eq(events.groupId, input.groupId),
        eq(events.status, 'scheduled'),
        gt(events.startsAt, now),
      ),
    )
    .limit(1);
  if (!event) throw new DomainError('not_found', 'Encontro não encontrado');
  const inserted = await db
    .insert(eventNudges)
    .values({ eventId: event.id, userId: input.targetUserId, sentBy: input.actorId })
    .onConflictDoNothing()
    .returning({ userId: eventNudges.userId });
  if (inserted.length === 0) {
    throw new DomainError('conflict', 'Essa pessoa já foi chamada para este encontro');
  }
}
