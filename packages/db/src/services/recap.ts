import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../client';
import { eventParticipants, events, gamePlayers, games, groups, user } from '../schema';
import { getDeckCovers } from './decks';

/**
 * Resumo da noite (8.6): o que dá para mostrar de um encontro finalizado para quem tem o link —
 * só primeiros nomes, comandantes e placar. Nada de local, e-mail, foto ou nome do grupo.
 */
export interface EventRecap {
  eventId: string;
  title: string;
  startsAt: Date;
  games: {
    number: number;
    format: string;
    players: { name: string; commanders: string[]; result: 'win' | 'loss' | 'draw' }[];
    winners: string[];
  }[];
  /** Quem jogou, por vitórias (e depois por nome). */
  standings: { name: string; wins: number; games: number }[];
  /** Arte do comandante de quem mais venceu (para a imagem de compartilhamento). */
  artUri: string | null;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Primeiro nome; se dois jogadores têm o mesmo, acrescenta a inicial do sobrenome. */
function displayNames(people: { userId: string; name: string }[]) {
  const byFirst = new Map<string, Set<string>>();
  for (const p of people) {
    const key = firstName(p.name).toLowerCase();
    byFirst.set(key, (byFirst.get(key) ?? new Set()).add(p.userId));
  }
  return new Map(
    people.map((p) => {
      const first = firstName(p.name);
      const parts = p.name.trim().split(/\s+/);
      const clash = (byFirst.get(first.toLowerCase())?.size ?? 0) > 1 && parts.length > 1;
      return [p.userId, clash ? `${first} ${parts[parts.length - 1]![0]}.` : first];
    }),
  );
}

/** Resumo público do encontro; `null` se ele não foi finalizado ou não teve partida. */
export async function getEventRecap(db: Database, eventId: string): Promise<EventRecap | null> {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event || event.status !== 'finished') return null;
  const gameRows = await db
    .select({ id: games.id, number: games.number, format: games.format })
    .from(games)
    .where(eq(games.eventId, event.id))
    .orderBy(asc(games.number));
  if (gameRows.length === 0) return null;
  const playerRows = await db
    .select({
      gameId: gamePlayers.gameId,
      userId: gamePlayers.userId,
      name: user.name,
      result: gamePlayers.result,
      deckId: gamePlayers.deckId,
    })
    .from(gamePlayers)
    .innerJoin(user, eq(user.id, gamePlayers.userId))
    .where(
      inArray(
        gamePlayers.gameId,
        gameRows.map((g) => g.id),
      ),
    );
  const names = displayNames(
    [...new Map(playerRows.map((p) => [p.userId, p])).values()].map((p) => ({
      userId: p.userId,
      name: p.name,
    })),
  );
  const covers = await getDeckCovers(
    db,
    playerRows.flatMap((p) => (p.deckId ? [p.deckId] : [])),
  );

  const recapGames = gameRows.map((game) => {
    const players = playerRows
      .filter((p) => p.gameId === game.id)
      .map((p) => ({
        name: names.get(p.userId)!,
        commanders: p.deckId ? (covers.get(p.deckId)?.cards.map((c) => c.name) ?? []) : [],
        result: p.result,
      }))
      .sort(
        (a, b) =>
          Number(b.result === 'win') - Number(a.result === 'win') || a.name.localeCompare(b.name),
      );
    return {
      number: game.number,
      format: game.format,
      players,
      winners: players.filter((p) => p.result === 'win').map((p) => p.name),
    };
  });

  const tally = new Map<string, { userId: string; name: string; wins: number; games: number }>();
  for (const p of playerRows) {
    const row = tally.get(p.userId) ?? {
      userId: p.userId,
      name: names.get(p.userId)!,
      wins: 0,
      games: 0,
    };
    row.games += 1;
    if (p.result === 'win') row.wins += 1;
    tally.set(p.userId, row);
  }
  const standings = [...tally.values()].sort(
    (a, b) => b.wins - a.wins || a.name.localeCompare(b.name),
  );
  const top = standings[0];
  const topDeck = top?.wins
    ? playerRows.find((p) => p.userId === top.userId && p.result === 'win' && p.deckId)?.deckId
    : undefined;

  return {
    eventId: event.id,
    title: event.title,
    startsAt: event.startsAt,
    games: recapGames,
    standings: standings.map(({ name, wins, games: played }) => ({ name, wins, games: played })),
    artUri: topDeck ? (covers.get(topDeck)?.artUri ?? null) : null,
  };
}

/**
 * Marca o resumo como enviado (uma vez por encontro) e devolve para quem mandar: quem jogou e
 * quem confirmou presença, mais o nome do grupo. `null` se já foi enviado ou não há o que resumir.
 */
export async function claimEventRecap(db: Database, eventId: string, now = new Date()) {
  const recap = await getEventRecap(db, eventId);
  if (!recap) return null;
  const [claimed] = await db
    .update(events)
    .set({ recapSentAt: now })
    .where(and(eq(events.id, eventId), isNull(events.recapSentAt)))
    .returning({ groupId: events.groupId });
  if (!claimed) return null;
  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, claimed.groupId));
  const [players, confirmed] = await Promise.all([
    db
      .selectDistinct({ userId: gamePlayers.userId })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .where(eq(games.eventId, eventId)),
    db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.rsvp, 'yes'))),
  ]);
  return {
    recap,
    groupId: claimed.groupId,
    groupName: group?.name ?? '',
    userIds: [...new Set([...players, ...confirmed].map((r) => r.userId))],
  };
}
