import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { events, groups } from './app';
import { storeEvents } from './stores';

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/**
 * Torneio do grupo (9.1), num encontro, em qualquer formato: pods nos multijogador e pares no um
 * contra um e nas duplas (regras em `@boramarcar/core/tournaments`).
 */
export const tournaments = pgTable(
  'tournaments',
  {
    id: id(),
    /** Torneio do grupo: num encontro. Torneio de loja (10.2b): num evento da loja (os dois `null`). */
    groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
    eventId: text('event_id').references(() => events.id, { onDelete: 'cascade' }),
    storeEventId: text('store_event_id')
      .unique()
      .references(() => storeEvents.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    format: text('format').notNull(),
    /** `pod` ou `pair` (do formato). */
    tableKind: text('table_kind').notNull(),
    /** Pessoas por inscrição (2 no 2HG). */
    entrantSize: integer('entrant_size').notNull().default(1),
    bestOf: integer('best_of').notNull().default(1),
    pointsWin: integer('points_win').notNull().default(3),
    pointsDraw: integer('points_draw').notNull().default(1),
    pointsLoss: integer('points_loss').notNull().default(0),
    /** Rodadas planejadas; `null` = as recomendadas para o número de inscritos, ao começar. */
    rounds: integer('rounds'),
    /** Cada jogo do torneio vira uma partida do grupo (conta no ranking). */
    countsInRanking: boolean('counts_in_ranking').notNull().default(true),
    /** `registration` → `running` → `finished`. */
    status: text('status').notNull().default('registration'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('tournaments_group_idx').on(t.groupId, t.createdAt)],
);

/** Inscrição: uma pessoa ou, no 2HG, uma dupla. */
export const tournamentEntrants = pgTable(
  'tournament_entrants',
  {
    id: id(),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    /** Convidado sem conta (torneio de loja): só o nome, sem membros. */
    guestName: text('guest_name'),
    createdAt: createdAt(),
  },
  (t) => [index('tournament_entrants_tournament_idx').on(t.tournamentId)],
);

/** Quem forma cada inscrição; a mesma pessoa entra uma vez só por torneio. */
export const tournamentEntrantMembers = pgTable(
  'tournament_entrant_members',
  {
    entrantId: text('entrant_id')
      .notNull()
      .references(() => tournamentEntrants.id, { onDelete: 'cascade' }),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.entrantId, t.userId] }),
    uniqueIndex('tournament_entrant_members_unique_idx').on(t.tournamentId, t.userId),
  ],
);

export const tournamentRounds = pgTable(
  'tournament_rounds',
  {
    id: id(),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('tournament_rounds_number_idx').on(t.tournamentId, t.number)],
);

/** Mesa da rodada: inscrições na ordem dos assentos e o resultado (jogos vencidos e empatados). */
export const tournamentTables = pgTable(
  'tournament_tables',
  {
    id: id(),
    roundId: text('round_id')
      .notNull()
      .references(() => tournamentRounds.id, { onDelete: 'cascade' }),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    entrantIds: jsonb('entrant_ids').$type<string[]>().notNull(),
    gameWins: jsonb('game_wins').$type<Record<string, number>>(),
    gameDraws: integer('game_draws').notNull().default(0),
    /** Partidas do grupo criadas por este resultado (refeitas numa correção). */
    gameIds: jsonb('game_ids').$type<string[]>().notNull().default([]),
    reportedBy: text('reported_by').references(() => user.id, { onDelete: 'set null' }),
    reportedAt: timestamp('reported_at', { withTimezone: true }),
  },
  (t) => [index('tournament_tables_round_idx').on(t.roundId)],
);

/** Linha do tempo do torneio ("Rodada 2 começou", "mesa 3 registrada", "fim"). */
export const tournamentEvents = pgTable(
  'tournament_events',
  {
    id: id(),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index('tournament_events_tournament_idx').on(t.tournamentId, t.createdAt)],
);
