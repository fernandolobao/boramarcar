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
    /** Quando a pessoa entrou no grupo (boas-vindas no painel). */
    joinedAt: z.coerce.date().optional(),
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

/** Configurações do grupo (mesa, duração mínima, pontos do ranking e tipo de jogo padrão). */
export const groupSettingsSchema = z
  .object({
    tableSize: z.number(),
    minDurationMinutes: z.number(),
    pointsWin: z.number(),
    pointsDraw: z.number(),
    pointsLoss: z.number(),
    defaultFormat: z.string(),
  })
  .loose();
export type GroupSettings = z.infer<typeof groupSettingsSchema>;

export const seasonSchema = z
  .object({ id: z.string(), name: z.string(), startsAt: date, endsAt: date })
  .loose();
export type Season = z.infer<typeof seasonSchema>;

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
          /** Quem registrou ou admins podem editar e remover. */
          canEdit: z.boolean().optional(),
          firstPlayerId: z.string().nullish(),
          winningTurn: z.number().nullish(),
          durationMinutes: z.number().nullish(),
          notes: z.string().nullish(),
          winners: z.array(personSchema.loose()),
          players: z.array(
            personSchema
              .extend({
                result: z.enum(['win', 'loss', 'draw']),
                deckName: z.string().nullable(),
                deckId: z.string().nullish(),
                seat: z.number().nullish(),
                team: z.number().nullish(),
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
    /** Rascunho (11.2) ou publicado. Servidores antigos não mandam: publicado. */
    status: z.enum(['draft', 'published']).default('published'),
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
  'games_100',
  'wins_25',
  'wins_50',
  'decks_5',
  'groups_2',
  'opponents_10',
  'nemesis',
  'underdog_10',
  'proxy_win',
  'comeback',
  'events_streak_4',
  'months_12',
  'enturmado',
  'tournament_first',
  'tournament_top',
  'tournament_champion',
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
    // Conquistas que esta versão do app não conhece (criadas depois) são ignoradas, em vez de
    // derrubar o perfil inteiro.
    achievements: z.array(z.unknown()).transform((list) =>
      list.flatMap((a) => {
        const parsed = achievementSchema.safeParse(a);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
    seasonTitles: z.array(
      z.object({ seasonName: z.string(), groupName: z.string(), endsAt: date }).loose(),
    ),
  })
  .loose();
export type PlayerProfile = z.infer<typeof playerProfileSchema>;

/** Preferências da pessoa: fuso, idioma (site e e-mails) e avisos por e-mail. */
export const preferencesSchema = z
  .object({
    timeZone: z.string(),
    locale: z.enum(['pt-BR', 'en']),
    emailNotifications: z.boolean(),
    /** Cidade do perfil (10.3). */
    city: z
      .object({ code: z.string(), name: z.string(), uf: z.string(), slug: z.string() })
      .nullable()
      .optional(),
  })
  .loose();
export type Preferences = z.infer<typeof preferencesSchema>;

/** Estatísticas do grupo (só o que o app usa; o resto passa por `loose`). */
export const groupStatsSchema = z
  .object({
    totalGames: z.number(),
    /** Confronto direto entre cada par (rivalidades no painel). */
    headToHead: z
      .array(
        z.object({
          userId: z.string(),
          opponentId: z.string(),
          games: z.number(),
          wins: z.number(),
          losses: z.number(),
        }),
      )
      .optional(),
    averageWinningTurn: z.number().nullable().optional(),
    averageDurationMinutes: z.number().nullable().optional(),
    players: z.array(
      z
        .object({
          userId: z.string(),
          name: z.string(),
          games: z.number(),
          wins: z.number(),
          currentStreak: z.number(),
          bestStreak: z.number(),
          recent: z.array(z.enum(['win', 'loss', 'draw'])),
        })
        .loose(),
    ),
    commanders: z.array(
      z
        .object({
          name: z.string(),
          games: z.number(),
          wins: z.number(),
          winRate: z.number(),
          artUri: z.string().nullable().optional(),
          players: z.array(z.object({ userId: z.string(), name: z.string() })),
        })
        .loose(),
    ),
    activity: z.array(z.object({ month: z.string(), games: z.number() })),
  })
  .loose();
export type GroupStats = z.infer<typeof groupStatsSchema>;

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
    board: z.enum(['commander', 'mainboard', 'sideboard', 'maybeboard', 'tokens']),
    quantity: z.number(),
    proxies: z.number(),
    scryfallId: z.string().nullable(),
    card: deckCardSchema.nullable(),
  })
  .loose();
export type DeckLine = z.infer<typeof deckLineSchema>;

/** Uma linha da coleção: cópias de uma impressão (foil ou não) e em que decks ela está. */
export const collectionEntrySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    scryfallId: z.string().nullable(),
    quantity: z.number(),
    foil: z.boolean(),
    card: deckCardSchema
      .extend({ artist: z.string().nullish(), rarity: z.string().nullish() })
      .nullable(),
    addedAt: date,
    decks: z.array(
      z
        .object({
          deckId: z.string(),
          deckName: z.string(),
          quantity: z.number(),
          proxies: z.number(),
        })
        .loose(),
    ),
  })
  .loose();
export type CollectionEntry = z.infer<typeof collectionEntrySchema>;

/** Uma impressão (edição) de uma carta, para trocar no editor de deck. */
export const cardPrintSchema = z
  .object({
    scryfallId: z.string(),
    name: z.string(),
    setCode: z.string(),
    setName: z.string(),
    collectorNumber: z.string(),
    imageUri: z.string().nullable(),
    priceUsd: z.string().nullable(),
    artist: z.string().nullish(),
  })
  .loose();
export type CardPrint = z.infer<typeof cardPrintSchema>;

/** Deck com as linhas e a análise (o mesmo que o site mostra). */
export const deckDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    format: z.string(),
    visibility: z.string(),
    status: z.enum(['draft', 'published']).default('published'),
    ownerName: z.string(),
    isOwner: z.boolean(),
    /** Origem da importação (archidekt, moxfield, text…) e o link, quando houver. */
    source: z.string().nullish(),
    sourceUrl: z.string().nullish(),
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

/** Confirmados do encontro e partidas de cada dupla, para a sugestão de mesas. */
export const eventPairingsSchema = z.object({
  format: z.string(),
  players: z.array(z.object({ userId: z.string(), name: z.string() })),
  pairs: z.array(z.object({ a: z.string(), b: z.string(), recent: z.number(), older: z.number() })),
});
export type EventPairings = z.infer<typeof eventPairingsSchema>;

/** "Com quem você ainda não jogou" (painel). */
export const partnerHintSchema = z.object({
  userId: z.string(),
  name: z.string(),
  lastPlayedAt: date.nullable(),
  confirmedNext: z.boolean(),
});
export type PartnerHint = z.infer<typeof partnerHintSchema>;

/** "Quem anda sumido" (só dono e admins). */
export const groupAttendanceSchema = z.object({
  members: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      attended: z.number(),
      of: z.number(),
      lastGameAt: date.nullable(),
      awaySince: date.nullable(),
    }),
  ),
  nextEvent: z.object({ id: z.string(), title: z.string(), startsAt: date }).nullable(),
  nudged: z.array(z.string()),
  confirmedNext: z.array(z.string()),
});
export type GroupAttendance = z.infer<typeof groupAttendanceSchema>;

/**
 * Item da central de notificações. `data.kind` diz o tipo; tipos que esta versão do app não
 * conhece aparecem com um texto genérico.
 */
export const notificationSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    data: z.object({ kind: z.string() }).loose(),
    createdAt: date,
    readAt: date.nullable(),
    groupName: z.string().nullable(),
    eventTitle: z.string().nullable(),
    people: z.record(z.string(), z.string()),
    /** Título e texto, nos avisos do ArcanaKin. */
    announcement: z.object({ title: z.string(), body: z.string() }).nullable().optional(),
    /** Nome do torneio, nos avisos de torneio. */
    tournamentName: z.string().nullable().optional(),
    /** Evento de loja, nos avisos de evento de loja. */
    storeEvent: z
      .object({
        title: z.string(),
        slug: z.string(),
        storeName: z.string().optional(),
        startsAt: date.optional(),
      })
      .nullable()
      .optional(),
    /** Aviso de uma loja que a pessoa segue (10.4). */
    storeNotice: z
      .object({ text: z.string(), storeName: z.string(), slug: z.string() })
      .nullable()
      .optional(),
  })
  .loose();
export type NotificationItem = z.infer<typeof notificationSchema>;

/** Recordes e "cara do grupo" (8.12). */
const recordAt = { eventId: z.string(), playedAt: date };
export const groupRecordsSchema = z
  .object({
    totalGames: z.number(),
    records: z.object({
      fastestWin: z
        .object({ ...recordAt, turn: z.number(), winnerIds: z.array(z.string()) })
        .loose()
        .nullable(),
      longestGame: z
        .object({ ...recordAt, minutes: z.number() })
        .loose()
        .nullable(),
      longestStreak: z
        .object({ ...recordAt, userId: z.string(), length: z.number() })
        .loose()
        .nullable(),
      busiestNight: z
        .object({ ...recordAt, games: z.number() })
        .loose()
        .nullable(),
      topCommander: z.object({ name: z.string(), wins: z.number() }).nullable(),
    }),
    face: z.object({
      colors: z.record(z.string(), z.number()),
      commanders: z.number(),
      meta: z.array(z.object({ name: z.string(), games: z.number() })),
    }),
    people: z.record(z.string(), z.string()),
    eventTitles: z.record(z.string(), z.string()),
  })
  .loose();
export type GroupRecordsView = z.infer<typeof groupRecordsSchema>;

/** Torneio do grupo (9.1), na lista. */
export const tournamentSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    format: z.string(),
    status: z.string(),
    eventId: z.string(),
    createdAt: date,
    entrants: z.number(),
  })
  .loose();
export type TournamentSummary = z.infer<typeof tournamentSummarySchema>;

/** Página do torneio: inscrições, rodadas e mesas, classificação e linha do tempo. */
export const tournamentViewSchema = z
  .object({
    tournament: z
      .object({
        id: z.string(),
        /** `null` no torneio de loja (10.2b), que pertence a um evento da loja. */
        groupId: z.string().nullable(),
        eventId: z.string().nullable(),
        storeEventId: z.string().nullable().optional(),
        name: z.string(),
        format: z.string(),
        table: z.enum(['pod', 'pair']),
        entrantSize: z.number(),
        bestOf: z.number(),
        rounds: z.number().nullable(),
        /** Top cut depois do suíço (9.2), ou `null`. */
        topCut: z.number().nullable().optional(),
        /** Estrutura (9.4): suíço, eliminação simples ou todos contra todos. */
        structure: z
          .enum(['swiss', 'single_elimination', 'double_elimination', 'round_robin'])
          .optional(),
        status: z.string(),
        countsInRanking: z.boolean(),
        createdAt: date,
      })
      .loose(),
    event: z.object({ title: z.string(), startsAt: date }).loose().nullable(),
    canManage: z.boolean(),
    myEntrantId: z.string().nullable(),
    entrants: z.array(
      z.object({ id: z.string(), name: z.string(), memberIds: z.array(z.string()) }).loose(),
    ),
    rounds: z.array(
      z
        .object({
          id: z.string(),
          number: z.number(),
          /** `swiss` ou `top` (9.2); a fase do top em `stageName`. */
          stage: z.enum(['swiss', 'top']).optional(),
          stageName: z.enum(['quarterfinal', 'semifinal', 'final']).nullable().optional(),
          tables: z.array(
            z
              .object({
                id: z.string(),
                number: z.number(),
                entrants: z.array(z.string()),
                gameWins: z.record(z.string(), z.number()),
                gameDraws: z.number(),
                reported: z.boolean(),
                /** Eliminação dupla (9.4): de qual chave é a mesa. */
                bracket: z.enum(['winners', 'losers', 'final']).nullable().optional(),
              })
              .loose(),
          ),
        })
        .loose(),
    ),
    standings: z.array(
      z
        .object({
          entrant: z.string(),
          points: z.number(),
          wins: z.number(),
          draws: z.number(),
          losses: z.number(),
          byes: z.number(),
          omw: z.number(),
          gw: z.number(),
          ogw: z.number(),
          rank: z.number(),
        })
        .loose(),
    ),
    timeline: z.array(
      z
        .object({ kind: z.string(), data: z.record(z.string(), z.unknown()), createdAt: date })
        .loose(),
    ),
    /** O que o botão de quem organiza faz agora; `null` enquanto houver mesa sem resultado. */
    nextStep: z.enum(['round', 'topCut', 'finish']).nullable().optional(),
    /** Campeão (inscrição), com o torneio encerrado e um vencedor único. */
    champion: z.string().nullable().optional(),
  })
  .loose();
export type TournamentView = z.infer<typeof tournamentViewSchema>;

/** Perfil público de loja (10.1), sem o e-mail de contato. */
export const storePublicSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    city: z.string(),
    about: z.string().nullable(),
    address: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    hours: z.string().nullable(),
    instagram: z.string().nullable(),
    whatsapp: z.string().nullable(),
    website: z.string().nullable(),
    formats: z.array(z.string()),
    verified: z.boolean(),
    logoUrl: z.string().nullable().optional(),
  })
  .loose();
export type StorePublic = z.infer<typeof storePublicSchema>;

export const storeEventSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    startsAt: date,
    format: z.string(),
    kind: z.string(),
    capacity: z.number().nullable(),
    status: z.string(),
  })
  .loose();

/** Evento de loja (10.2) para quem vê: vagas, premiação, regras e a própria inscrição. */
export const storeEventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    startsAt: date,
    format: z.string(),
    kind: z.string(),
    capacity: z.number().nullable(),
    prizes: z.string().nullable(),
    rules: z.string().nullable(),
    status: z.string(),
    store: z.object({ name: z.string(), slug: z.string() }),
    registered: z.number(),
    waitlist: z.number(),
    myEntry: z.object({ id: z.string(), status: z.enum(['registered', 'waitlist']) }).nullable(),
  })
  .loose();
export type StoreEvent = z.infer<typeof storeEventSchema>;

export const myStoreEntrySchema = z
  .object({
    entryId: z.string(),
    status: z.enum(['registered', 'waitlist']),
    event: z.object({
      id: z.string(),
      title: z.string(),
      startsAt: date,
      format: z.string(),
      kind: z.string(),
    }),
    store: z.object({ name: z.string(), slug: z.string() }),
  })
  .loose();
export type MyStoreEntry = z.infer<typeof myStoreEntrySchema>;

const storeEntryResultSchema = z
  .object({
    id: z.string(),
    eventId: z.string(),
    slug: z.string(),
    status: z.enum(['registered', 'waitlist']),
  })
  .loose();
export { storeEntryResultSchema };

/** Município do IBGE (10.3). */
export const municipalitySchema = z
  .object({ code: z.string(), name: z.string(), uf: z.string(), slug: z.string() })
  .loose();
export type Municipality = z.infer<typeof municipalitySchema>;

/** Lojas e eventos por perto (10.3). */
export const discoverySchema = z
  .object({
    origin: z
      .object({
        kind: z.enum(['city', 'device']),
        city: z.object({ name: z.string(), uf: z.string(), slug: z.string() }).optional(),
      })
      .loose(),
    events: z.array(
      z
        .object({
          id: z.string(),
          title: z.string(),
          startsAt: date,
          format: z.string(),
          kind: z.string(),
          capacity: z.number().nullable(),
          registered: z.number(),
          waitlist: z.number(),
          distanceKm: z.number(),
          store: z.object({
            name: z.string(),
            slug: z.string(),
            municipality: z.object({ name: z.string(), uf: z.string() }),
          }),
        })
        .loose(),
    ),
    stores: z.array(
      z
        .object({
          id: z.string(),
          slug: z.string(),
          name: z.string(),
          logoUrl: z.string().nullable(),
          verified: z.boolean(),
          offers: z.array(z.string()),
          distanceKm: z.number(),
          municipality: z.object({ name: z.string(), uf: z.string(), slug: z.string() }),
          nextEvent: z.object({ id: z.string(), title: z.string(), startsAt: date }).nullable(),
        })
        .loose(),
    ),
  })
  .loose();
export type Discovery = z.infer<typeof discoverySchema>;
