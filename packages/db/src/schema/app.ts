import { DECK_BOARDS, DECK_SOURCES, GAME_RESULTS } from '@boramarcar/core';
import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
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
  /** Jogadores que fecham a mesa nas sugestões de horário (1.12). */
  tableSize: integer('table_size').notNull().default(4),
  minDurationMinutes: integer('min_duration_minutes').notNull().default(120),
  /** Pontos do ranking (2.7). */
  pointsWin: integer('points_win').notNull().default(3),
  pointsDraw: integer('points_draw').notNull().default(1),
  pointsLoss: integer('points_loss').notNull().default(0),
  /** Tipo de jogo pré-selecionado ao registrar partidas (ver `GAME_FORMATS`). */
  defaultFormat: text('default_format').notNull().default('commander'),
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
    /** Complemento: apartamento, portaria, como chegar… */
    details: text('details'),
    /** Coordenadas (2.14) do autocompletar ou do pino no mapa. */
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    hostUserId: text('host_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
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

/** Disponibilidade recorrente: "toda quinta, das 19h às 23h". */
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** 0 = domingo … 6 = sábado */
    weekday: integer('weekday').notNull(),
    /** "HH:MM"; fim ≤ início significa que termina no dia seguinte. */
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    /** Fuso em que os horários foram definidos. */
    timeZone: text('time_zone').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('availability_rules_group_idx').on(t.groupId)],
);

export const availabilityRuleLocations = pgTable(
  'availability_rule_locations',
  {
    ruleId: text('rule_id')
      .notNull()
      .references(() => availabilityRules.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.ruleId, t.locationId] })],
);

/** Datas em que uma regra recorrente não vale ("nesta quinta não posso"). */
export const availabilityRuleExceptions = pgTable(
  'availability_rule_exceptions',
  {
    ruleId: text('rule_id')
      .notNull()
      .references(() => availabilityRules.id, { onDelete: 'cascade' }),
    /** Data local "AAAA-MM-DD" no fuso da regra. */
    date: text('date').notNull(),
  },
  (t) => [primaryKey({ columns: [t.ruleId, t.date] })],
);

/** Janelas "a mesa fechou!" já avisadas (uma vez por grupo, dia e local). */
export const windowNotifications = pgTable(
  'window_notifications',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.key] })],
);

/**
 * Aparelhos que recebem notificações push (app mobile, Expo Push). Um token por aparelho; se
 * outra pessoa entrar no mesmo celular, o token passa para ela. Ter token = avisos ligados
 * naquele aparelho (desligar no app apaga o token).
 */
export const pushTokens = pgTable(
  'push_tokens',
  {
    token: text('token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('push_tokens_user_idx').on(t.userId)],
);

/**
 * Onboarding (Fase 7): só o que não dá para deduzir dos dados (ex.: "dispensou os primeiros
 * passos", "pulou o guia"). Os passos em si (disponibilidade, deck, convite…) são calculados.
 */
export const onboardingSteps = pgTable(
  'onboarding_steps',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    step: text('step').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.step] })],
);

/**
 * Feedback do beta (8.4): o que a pessoa contou pelo site ou pelo app. Some com a conta (LGPD);
 * a página guarda só o caminho, sem query string.
 */
export const feedback = pgTable(
  'feedback',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    page: text('page'),
    platform: text('platform').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('feedback_created_idx').on(t.createdAt)],
);

/* ---------- Beta assistido (8.5) ---------- */

/** Configuração do beta: uma linha só (`id = 'beta'`), com a data única de início. */
export const betaProgram = pgTable('beta_program', {
  id: text('id').primaryKey().default('beta'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  updatedAt: updatedAt(),
});

/** Grupos do beta; `welcomed_at` marca o e-mail de boas-vindas já enviado. */
export const betaGroups = pgTable('beta_groups', {
  groupId: text('group_id')
    .primaryKey()
    .references(() => groups.id, { onDelete: 'cascade' }),
  welcomedAt: timestamp('welcomed_at', { withTimezone: true }),
  createdAt: createdAt(),
});

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
    /** Quando o lembrete do dia foi enviado (evita duplicar). */
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    /** Quando o resumo da noite (8.6) foi enviado, ao finalizar (evita duplicar ao reabrir). */
    recapSentAt: timestamp('recap_sent_at', { withTimezone: true }),
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
    /** Tipo de jogo (ver `GAME_FORMATS`); define as regras de jogadores, times e vencedor. */
    format: text('format').notNull().default('commander'),
    /** Detalhes opcionais para estatísticas. */
    firstPlayerId: text('first_player_id').references(() => user.id, { onDelete: 'set null' }),
    winningTurn: integer('winning_turn'),
    durationMinutes: integer('duration_minutes'),
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

/** Temporadas do ranking (2.6): intervalos nomeados, ex.: "2º semestre 2026". */
export const seasons = pgTable(
  'seasons',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    /** Fim exclusivo. */
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('seasons_group_idx').on(t.groupId, t.startsAt)],
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
    /** `private` | `group` | `public` (ver `DECK_VISIBILITIES`). */
    visibility: text('visibility').notNull().default('group'),
    source: deckSource('source').notNull().default('manual'),
    sourceId: text('source_id'),
    sourceUrl: text('source_url'),
    description: text('description'),
    /** Sinais do Commander Spellbook (bracket) e o hash da lista que os gerou. */
    bracketSignals: jsonb('bracket_signals'),
    bracketHash: text('bracket_hash'),
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
    /** Time (1, 2, …) em formatos como Two-Headed Giant. */
    team: integer('team'),
    /** 1 = primeiro a ser eliminado. */
    eliminatedOrder: integer('eliminated_order'),
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
    /** Cores de mana que a carta produz (Scryfall `produced_mana`). */
    producedMana: text('produced_mana').array(),
    gameChanger: boolean('game_changer').notNull().default(false),
    edhrecRank: integer('edhrec_rank'),
    /** Funções do Scryfall Tagger (ramp, draw, …); `null` = ainda não consultado. */
    roles: text('roles').array(),
    rolesCheckedAt: timestamp('roles_checked_at', { withTimezone: true }),
    /** Edição desta impressão. */
    setCode: text('set_code'),
    setName: text('set_name'),
    collectorNumber: text('collector_number'),
    /** Verso de cartas de duas faces. */
    backImageUri: text('back_image_uri'),
    backName: text('back_name'),
    /** Legalidade por formato (Scryfall): lista de banidas e restritas. */
    legalities: jsonb('legalities').$type<Record<string, string>>(),
    /** Para a coleção: ilustrador, lançamento da impressão, raridade e preço foil. */
    artist: text('artist'),
    releasedAt: text('released_at'),
    rarity: text('rarity'),
    priceUsdFoil: text('price_usd_foil'),
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
    // Uma linha por carta, edição (impressão), proxy e foil em cada board: foil e não foil da
    // mesma edição convivem no deck (ex.: 1 Plains foil e 1 comum).
    uniqueIndex('deck_cards_unique_idx').on(
      t.deckId,
      t.board,
      t.cardName,
      sql`coalesce(${t.scryfallId}, '')`,
      t.isProxy,
      t.isFoil,
    ),
  ],
);

/* ---------- Coleção pessoal ---------- */

/**
 * Cartas físicas que a pessoa tem. Uma linha por carta, impressão e acabamento (foil ou não).
 * Proxies nunca entram aqui. Os decks só acrescentam (ver `syncCollectionFromDecks`): tirar uma
 * carta de um deck não tira da coleção.
 */
export const collectionCards = pgTable(
  'collection_cards',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardName: text('card_name').notNull(),
    scryfallId: text('scryfall_id').references(() => cards.scryfallId, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull().default(1),
    isFoil: boolean('is_foil').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('collection_cards_user_idx').on(t.userId),
    uniqueIndex('collection_cards_unique_idx').on(
      t.userId,
      t.cardName,
      sql`coalesce(${t.scryfallId}, '')`,
      t.isFoil,
    ),
  ],
);

/**
 * Cache compartilhado de respostas de serviços externos (Scryfall, Commander Spellbook, PTAX…),
 * para não repetir a mesma chamada a cada função do servidor (a memória delas se perde a cada
 * "cold start"). Vencido, o valor ainda serve de reserva quando o serviço não responde.
 */
export const externalCache = pgTable(
  'external_cache',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [index('external_cache_expires_idx').on(t.expiresAt)],
);

/** Contadores de limite de uso (janela fixa) por chave, ex.: `import:<usuário>`. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
