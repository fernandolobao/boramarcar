import {
  boolean,
  doublePrecision,
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

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/**
 * Perfil de loja (10.1): criado por um admin do ArcanaKin; o dono chega por convite por e-mail.
 * O e-mail de contato é só para a administração (não aparece no perfil público).
 */
export const stores = pgTable('stores', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  contactEmail: text('contact_email').notNull(),
  about: text('about'),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  hours: text('hours'),
  instagram: text('instagram'),
  whatsapp: text('whatsapp'),
  website: text('website'),
  formats: jsonb('formats').$type<string[]>().notNull().default([]),
  /** Selo "loja verificada", dado por um admin. */
  verified: boolean('verified').notNull().default(false),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Equipe da loja: `owner` (cuida da equipe) ou `staff` (edita o perfil e os eventos). */
export const storeMembers = pgTable(
  'store_members',
  {
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.storeId, t.userId] }),
    index('store_members_user_idx').on(t.userId),
  ],
);

/** Convite por e-mail (dono ou equipe): só a conta com esse e-mail aceita, uma vez, no prazo. */
export const storeInvites = pgTable(
  'store_invites',
  {
    id: id(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull(),
    token: text('token').notNull().unique(),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => [index('store_invites_store_idx').on(t.storeId)],
);

/** Evento da loja (10.2): torneio ou noite livre, com vagas, código do balcão, premiação e regras. */
export const storeEvents = pgTable(
  'store_events',
  {
    id: id(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    format: text('format').notNull(),
    /** `tournament` ou `casual`. */
    kind: text('kind').notNull(),
    /** Vagas; `null` = sem limite. */
    capacity: integer('capacity'),
    /** Código curto para a inscrição no balcão. */
    code: text('code').notNull().unique(),
    prizes: text('prizes'),
    rules: text('rules'),
    /** `scheduled`, `cancelled` ou `finished`. */
    status: text('status').notNull().default('scheduled'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('store_events_store_idx').on(t.storeId, t.startsAt)],
);

/** Inscrição num evento de loja: de uma conta ou de um convidado (só o nome). */
export const storeEventEntries = pgTable(
  'store_event_entries',
  {
    id: id(),
    storeEventId: text('store_event_id')
      .notNull()
      .references(() => storeEvents.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    guestName: text('guest_name'),
    /** `registered` ou `waitlist`. */
    status: text('status').notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('store_event_entries_event_idx').on(t.storeEventId),
    uniqueIndex('store_event_entries_user_idx').on(t.storeEventId, t.userId),
  ],
);
