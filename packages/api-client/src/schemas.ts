import { z } from 'zod';

/**
 * Esquemas das respostas da API v1. Validam só o que o cliente usa (`.loose()` mantém campos
 * extras) e convertem datas ISO em `Date`.
 */
const date = z.coerce.date();

/** Grupo recém-criado ou em que a pessoa acabou de entrar (sem o papel na resposta). */
export const createdGroupSchema = z.object({ id: z.string(), name: z.string() }).loose();

export const groupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['owner', 'admin', 'member']),
    inviteCode: z.string().optional(),
    defaultFormat: z.string().optional(),
  })
  .loose();
export type Group = z.infer<typeof groupSchema>;

export const eventStatusSchema = z.enum(['scheduled', 'cancelled', 'finished']);
export const rsvpSchema = z.enum(['yes', 'maybe', 'no']);
export type Rsvp = z.infer<typeof rsvpSchema>;

export const eventSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    startsAt: date,
    endsAt: date.nullable(),
    status: eventStatusSchema,
    locationName: z.string().nullable(),
  })
  .loose();
export type EventSummary = z.infer<typeof eventSummarySchema>;

/** Encontro passado no histórico: quantas partidas e presenças e quem venceu. */
export const eventHistoryItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    startsAt: date,
    status: eventStatusSchema,
    locationName: z.string().nullable(),
    games: z.number(),
    attendees: z.number(),
    winners: z.array(z.string()),
  })
  .loose();
export const eventHistorySchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  pages: z.number(),
  items: z.array(eventHistoryItemSchema),
});
export type EventHistory = z.infer<typeof eventHistorySchema>;
export type EventHistoryItem = z.infer<typeof eventHistoryItemSchema>;

export const memberSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    role: z.enum(['owner', 'admin', 'member']),
  })
  .loose();
export type Member = z.infer<typeof memberSchema>;

const personSchema = z.object({
  userId: z.string(),
  name: z.string(),
  image: z.string().nullish(),
});

export const eventDetailSchema = z
  .object({
    id: z.string(),
    groupId: z.string(),
    title: z.string(),
    startsAt: date,
    endsAt: date.nullable(),
    status: eventStatusSchema,
    canManage: z.boolean(),
    location: z.object({ id: z.string(), name: z.string() }).loose().nullable(),
    participants: z.array(personSchema.extend({ rsvp: rsvpSchema })),
    games: z.array(
      z
        .object({
          id: z.string(),
          number: z.number(),
          format: z.string(),
          isDraw: z.boolean(),
          winners: z.array(personSchema.loose()),
          players: z.array(
            personSchema
              .extend({
                result: z.enum(['win', 'loss', 'draw']),
                deckName: z.string().nullable(),
              })
              .loose(),
          ),
        })
        .loose(),
    ),
  })
  .loose();
export type EventDetail = z.infer<typeof eventDetailSchema>;

export const standingSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    position: z.number(),
    games: z.number(),
    wins: z.number(),
    losses: z.number(),
    draws: z.number(),
    points: z.number(),
    winRate: z.number(),
  })
  .loose();
export type Standing = z.infer<typeof standingSchema>;

export const rankingSchema = z
  .object({ totalGames: z.number(), standings: z.array(standingSchema) })
  .loose();
export type Ranking = z.infer<typeof rankingSchema>;

export const deckSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    format: z.string(),
    visibility: z.string(),
    cardCount: z.number().nullable(),
    proxyCount: z.number(),
    /** Nota 0–100 (null quando o formato não tem nota). Servidores antigos não mandam. */
    score: z.number().nullable().optional(),
    /** Bracket mínimo (2 = 1–2, 3, 4 = 4–5); null fora do Commander. */
    bracket: z
      .union([z.literal(2), z.literal(3), z.literal(4)])
      .nullable()
      .optional(),
    updatedAt: date,
  })
  .loose();
export type DeckSummary = z.infer<typeof deckSummarySchema>;
export const ACHIEVEMENT_IDS = [
  'first_game',
  'first_win',
  'games_10',
  'games_50',
  'wins_10',
  'streak_3',
  'streak_5',
  'fast_win',
  'first_player_win',
  'deck_loyal',
  'deck_variety',
  'versatile',
  'team_win',
  'season_champion',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const achievementSchema = z
  .object({
    id: z.enum(ACHIEVEMENT_IDS),
    unlocked: z.boolean(),
    unlockedAt: date.nullable(),
    progress: z.number(),
    target: z.number(),
    count: z.number().optional(),
  })
  .loose();
export type Achievement = z.infer<typeof achievementSchema>;

/** Perfil de um jogador (o próprio ou alguém de um grupo em comum). */
export const playerProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    email: z.string().nullable(),
    isSelf: z.boolean(),
    memberSince: date,
    games: z.number(),
    wins: z.number(),
    winRate: z.number(),
    groups: z.array(
      z
        .object({ id: z.string(), name: z.string(), role: z.enum(['owner', 'admin', 'member']) })
        .loose(),
    ),
    decks: z.array(deckSummarySchema),
    achievements: z.array(achievementSchema),
    seasonTitles: z.array(
      z.object({ seasonName: z.string(), groupName: z.string(), endsAt: date }).loose(),
    ),
  })
  .loose();
export type PlayerProfile = z.infer<typeof playerProfileSchema>;

export const tableSetupSchema = z
  .object({
    eventId: z.string(),
    title: z.string(),
    status: eventStatusSchema,
    defaultFormat: z.string(),
    players: z.array(
      z.object({
        userId: z.string(),
        name: z.string(),
        confirmed: z.boolean(),
        decks: z.array(z.object({ id: z.string(), name: z.string() })),
      }),
    ),
  })
  .loose();
export type TableSetup = z.infer<typeof tableSetupSchema>;

/** Corpo de registrar partida (o servidor valida as regras do formato). */
export interface GameInput {
  format?: string;
  firstPlayerId?: string | null;
  winningTurn?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  players: {
    userId: string;
    result: 'win' | 'loss' | 'draw';
    deckId?: string | null;
    seat?: number | null;
    team?: number | null;
    eliminatedOrder?: number | null;
  }[];
}

export const availabilitySlotSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    userName: z.string(),
    startsAt: date,
    endsAt: date,
    note: z.string().nullable(),
    /** `once` = avulsa; `weekly` = ocorrência de uma regra semanal. */
    kind: z.enum(['once', 'weekly']),
    ruleId: z.string().nullable(),
    /** Data local da ocorrência (AAAA-MM-DD), só nas semanais. */
    date: z.string().nullable(),
    locationIds: z.array(z.string()),
  })
  .loose();
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

export const availabilityRuleSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    userName: z.string(),
    weekday: z.number(),
    startTime: z.string(),
    endTime: z.string(),
    timeZone: z.string(),
    note: z.string().nullable(),
    locationIds: z.array(z.string()),
    exceptions: z.array(z.string()),
  })
  .loose();
export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>;

export const gameWindowSchema = z
  .object({
    start: date,
    end: date,
    durationMinutes: z.number(),
    userIds: z.array(z.string()),
    locationId: z.string().nullable(),
    locationName: z.string().nullable(),
    players: z.array(z.object({ userId: z.string(), name: z.string() })),
  })
  .loose();
export type GameWindow = z.infer<typeof gameWindowSchema>;

export const locationSchema = z
  .object({ id: z.string(), name: z.string(), address: z.string().nullish() })
  .loose();
export type Location = z.infer<typeof locationSchema>;

export const deckCardSchema = z
  .object({
    scryfallId: z.string(),
    name: z.string(),
    manaCost: z.string().nullish(),
    cmc: z.number(),
    typeLine: z.string(),
    oracleText: z.string().nullish(),
    imageUri: z.string().nullish(),
    backImageUri: z.string().nullish(),
    backName: z.string().nullish(),
    setCode: z.string().nullish(),
    setName: z.string().nullish(),
    collectorNumber: z.string().nullish(),
    priceUsd: z.string().nullish(),
  })
  .loose();
export type DeckCard = z.infer<typeof deckCardSchema>;

export const deckLineSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    board: z.enum(['commander', 'mainboard', 'sideboard', 'maybeboard']),
    quantity: z.number(),
    proxies: z.number(),
    scryfallId: z.string().nullable(),
    card: deckCardSchema.nullable(),
  })
  .loose();
export type DeckLine = z.infer<typeof deckLineSchema>;

/** Deck com as linhas e a análise (o mesmo que o site mostra). */
export const deckDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    format: z.string(),
    visibility: z.string(),
    ownerName: z.string(),
    isOwner: z.boolean(),
    lines: z.array(deckLineSchema),
    analysis: z
      .object({
        totalCards: z.number(),
        commanders: z.array(z.string()),
        colorIdentity: z.array(z.string()),
        lands: z.number(),
        averageCmc: z.number(),
        manaCurve: z.record(z.string(), z.number()),
        roles: z.record(z.string(), z.number()),
        proxies: z.number(),
        gameChangers: z.array(z.string()),
        score: z.number().nullable(),
        validation: z.array(z.object({ code: z.string() }).loose()),
      })
      .loose(),
    bracket: z.object({ minimum: z.number() }).loose().nullable(),
  })
  .loose();
export type DeckDetail = z.infer<typeof deckDetailSchema>;

export const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
