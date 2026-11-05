import { DECK_BOARDS, DECK_SOURCES, GAME_RESULTS } from '@boramarcar/core';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const groupRole = pgEnum('group_role', ['owner', 'admin', 'member']);
export const eventStatus = pgEnum('event_status', ['scheduled', 'cancelled', 'finished']);
export const rsvpStatus = pgEnum('rsvp_status', ['yes', 'maybe', 'no']);
export const gameResult = pgEnum('game_result', GAME_RESULTS);
export const deckBoard = pgEnum('deck_board', DECK_BOARDS);
export const deckSource = pgEnum('deck_source', DECK_SOURCES);

/* ---------- Grupos ---------- */

export const groups = pgTable('groups', {
  id: id(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: createdAt(),
});

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: groupRole('role').notNull().default('member'),
    joinedAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index('group_members_user_idx').on(t.userId),
  ],
);

export const locations = pgTable(
  'locations',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    hostUserId: text('host_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('locations_group_idx').on(t.groupId)],
);

/* ---------- Disponibilidade ---------- */

export const availabilitySlots = pgTable(
  'availability_slots',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('availability_group_time_idx').on(t.groupId, t.startsAt, t.endsAt)],
);

/** Locais aceitos para um intervalo. Nenhuma linha = aceita qualquer local. */
export const availabilitySlotLocations = pgTable(
  'availability_slot_locations',
  {
    slotId: text('slot_id')
      .notNull()
      .references(() => availabilitySlots.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.locationId] })],
);

/* ---------- Eventos e partidas ---------- */

export const events = pgTable(
  'events',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    locationId: text('location_id').references(() => locations.id, { onDelete: 'set null' }),
    status: eventStatus('status').notNull().default('scheduled'),
    /** Incrementado a cada alteração (SEQUENCE do iCalendar). */
    sequence: integer('sequence').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('events_group_time_idx').on(t.groupId, t.startsAt)],
);

export const eventParticipants = pgTable(
  'event_participants',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rsvp: rsvpStatus('rsvp').notNull().default('yes'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

export const games = pgTable(
  'games',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    /** Desnormalizado para consultas de ranking por grupo. */
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('games_group_idx').on(t.groupId, t.playedAt),
    uniqueIndex('games_event_number_idx').on(t.eventId, t.number),
  ],
);

/* ---------- Decks e cartas ---------- */

export const decks = pgTable(
  'decks',
  {
    id: id(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    format: text('format').notNull().default('commander'),
    source: deckSource('source').notNull().default('manual'),
    sourceId: text('source_id'),
    sourceUrl: text('source_url'),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('decks_owner_idx').on(t.ownerId)],
);

export const gamePlayers = pgTable(
  'game_players',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deckId: text('deck_id').references(() => decks.id, { onDelete: 'set null' }),
    result: gameResult('result').notNull(),
    seat: integer('seat'),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.userId] }),
    index('game_players_user_idx').on(t.userId),
  ],
);

/** Cache local dos dados de cartas vindos do Scryfall. */
export const cards = pgTable(
  'cards',
  {
    scryfallId: text('scryfall_id').primaryKey(),
    oracleId: text('oracle_id'),
    name: text('name').notNull(),
    manaCost: text('mana_cost'),
    cmc: real('cmc').notNull().default(0),
    typeLine: text('type_line').notNull().default(''),
    oracleText: text('oracle_text'),
    colors: text('colors')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    colorIdentity: text('color_identity')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    imageUri: text('image_uri'),
    priceUsd: text('price_usd'),
    updatedAt: updatedAt(),
  },
  (t) => [index('cards_name_idx').on(sql`lower(${t.name})`)],
);

export const deckCards = pgTable(
  'deck_cards',
  {
    id: id(),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    cardName: text('card_name').notNull(),
    scryfallId: text('scryfall_id').references(() => cards.scryfallId, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull().default(1),
    board: deckBoard('board').notNull().default('mainboard'),
    isProxy: boolean('is_proxy').notNull().default(false),
    isFoil: boolean('is_foil').notNull().default(false),
  },
  (t) => [
    index('deck_cards_deck_idx').on(t.deckId),
    uniqueIndex('deck_cards_unique_idx').on(t.deckId, t.board, t.cardName, t.isProxy),
  ],
);
