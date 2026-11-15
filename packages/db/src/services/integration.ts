/**
 * Integração do grupo: dados para misturar a mesa e trazer de volta quem sumiu. As regras ficam
 * no core (`@boramarcar/core/integration`); aqui só as consultas.
 */
import type { PairCount } from '@boramarcar/core';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../client';
import { eventParticipants, gamePlayers, games, groupMembers, groups, user } from '../schema';
import { requireEvent } from './events';

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
