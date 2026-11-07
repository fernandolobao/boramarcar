import type { GameFormat } from '@boramarcar/core';
import {
  getEventDetail,
  getGroupSettings,
  listDecksForUsers,
  listMembers,
  type Database,
} from '@boramarcar/db';

export interface TableSetup {
  eventId: string;
  title: string;
  status: 'scheduled' | 'cancelled' | 'finished';
  defaultFormat: GameFormat;
  /** Membros do grupo (confirmados primeiro) com os decks de cada um. */
  players: {
    userId: string;
    name: string;
    confirmed: boolean;
    decks: { id: string; name: string }[];
  }[];
}

/** O que o modo mesa (5.6) precisa para montar a mesa, no site e no app. */
export async function getTableSetup(
  db: Database,
  input: { eventId: string; userId: string },
): Promise<TableSetup> {
  const event = await getEventDetail(db, input);
  const [members, settings] = await Promise.all([
    listMembers(db, event.groupId),
    getGroupSettings(db, { groupId: event.groupId, userId: input.userId }),
  ]);
  const decks = await listDecksForUsers(
    db,
    members.map((m) => m.userId),
  );
  const confirmed = new Set(
    event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.userId),
  );
  const players = [...members]
    .sort((a, b) => Number(confirmed.has(b.userId)) - Number(confirmed.has(a.userId)))
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      confirmed: confirmed.has(m.userId),
      decks: decks.filter((d) => d.ownerId === m.userId).map((d) => ({ id: d.id, name: d.name })),
    }));
  return {
    eventId: event.id,
    title: event.title,
    status: event.status,
    defaultFormat: settings.defaultFormat,
    players,
  };
}
