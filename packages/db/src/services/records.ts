import { groupFace, groupRecords, type RecordDecks } from '@boramarcar/core/integration';
import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../client';
import { events, gamePlayers, games, user } from '../schema';
import { getDeckCovers } from './decks';
import { requireMembership } from './groups';

/** Janela do "meta" (comandantes mais jogados) na cara do grupo. */
export const META_DAYS = 90;

/**
 * Recordes e "cara do grupo" (8.12), para quem é do grupo: vitória mais rápida, partida mais
 * longa, maior sequência, noite com mais partidas, comandante com mais vitórias, cores mais
 * jogadas e o meta dos últimos 90 dias. Com nomes e títulos dos encontros.
 */
export async function getGroupRecords(
  db: Database,
  input: { groupId: string; userId: string; now?: Date },
) {
  await requireMembership(db, input.groupId, input.userId);
  const now = input.now ?? new Date();
  const gameRows = await db
    .select({
      gameId: games.id,
      eventId: games.eventId,
      playedAt: games.playedAt,
      winningTurn: games.winningTurn,
      durationMinutes: games.durationMinutes,
    })
    .from(games)
    .where(eq(games.groupId, input.groupId));
  const ids = gameRows.map((g) => g.gameId);
  const playerRows = ids.length
    ? await db
        .select({
          gameId: gamePlayers.gameId,
          userId: gamePlayers.userId,
          result: gamePlayers.result,
          deckId: gamePlayers.deckId,
        })
        .from(gamePlayers)
        .where(inArray(gamePlayers.gameId, ids))
    : [];
  const covers = await getDeckCovers(
    db,
    playerRows.flatMap((p) => (p.deckId ? [p.deckId] : [])),
  );
  const decks: RecordDecks = Object.fromEntries(
    [...covers].map(([deckId, cover]) => [
      deckId,
      {
        commanders: cover.cards.map((c) => c.name).join(' & '),
        colorIdentity: cover.colorIdentity,
      },
    ]),
  );
  const list = gameRows.map((g) => ({
    ...g,
    players: playerRows.filter((p) => p.gameId === g.gameId),
  }));
  const records = groupRecords(list, decks);
  const face = groupFace(list, decks, { since: new Date(now.getTime() - META_DAYS * 86_400_000) });

  const userIds = [
    ...new Set([
      ...(records.fastestWin?.winnerIds ?? []),
      ...(records.longestStreak ? [records.longestStreak.userId] : []),
    ]),
  ];
  const eventIds = [
    ...new Set(
      [records.fastestWin, records.longestGame, records.longestStreak, records.busiestNight]
        .filter((r) => r !== null)
        .map((r) => r.eventId),
    ),
  ];
  const [names, titles] = await Promise.all([
    userIds.length
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
      : [],
    eventIds.length
      ? db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))
      : [],
  ]);
  return {
    totalGames: list.length,
    records,
    face,
    people: Object.fromEntries(names.map((n) => [n.id, n.name])) as Record<string, string>,
    eventTitles: Object.fromEntries(titles.map((e) => [e.id, e.title])) as Record<string, string>,
  };
}
export type GroupRecordsView = Awaited<ReturnType<typeof getGroupRecords>>;
