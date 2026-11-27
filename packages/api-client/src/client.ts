import { z } from 'zod';

/** Dicas das telas (7.4) que o app conhece. */
export const TIP_IDS = ['deck-analysis', 'table', 'collection', 'ranking'] as const;
export type TipId = (typeof TIP_IDS)[number];
import {
  deckComparisonSchema,
  groupRecordsSchema,
  tournamentSummarySchema,
  storePublicSchema,
  storeEventSummarySchema,
  storeEventSchema,
  myStoreEntrySchema,
  storeEntryResultSchema,
  tournamentViewSchema,
  notificationSchema,
  achievementSchema,
  availabilityRuleSchema,
  deckDetailSchema,
  availabilitySlotSchema,
  collectionEntrySchema,
  cardPrintSchema,
  deckSummarySchema,
  errorBodySchema,
  eventDetailSchema,
  eventHistorySchema,
  eventPairingsSchema,
  partnerHintSchema,
  groupAttendanceSchema,
  eventStatusSchema,
  eventSummarySchema,
  gameWindowSchema,
  createdGroupSchema,
  groupSchema,
  groupStatsSchema,
  groupSettingsSchema,
  locationSchema,
  memberSchema,
  playerProfileSchema,
  preferencesSchema,
  municipalitySchema,
  discoverySchema,
  rankingSchema,
  rsvpSchema,
  seasonSchema,
  tableSetupSchema,
  type AchievementId,
  type GameInput,
  type Rsvp,
} from './schemas';

/** Erro da API com o código do domínio (`not_found`, `forbidden`…) e o status HTTP. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** Origem do servidor, ex.: `https://www.arcanakin.com.br` (sem barra no fim). */
  baseUrl: string;
  /** Cabeçalhos de autenticação a cada pedido (no app: o cookie da sessão do Better Auth). */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  fetch?: typeof fetch;
  /** Tempo máximo de cada pedido (ms); depois disso vira `network_error`. */
  timeoutMs?: number;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Cliente tipado da API v1: cada método valida a resposta com Zod. */
export function createApiClient(options: ApiClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, '');
  const fetchFn = options.fetch ?? fetch;

  async function request<T extends z.ZodType>(
    method: Method,
    path: string,
    schema: T,
    body?: unknown,
  ): Promise<z.infer<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // Arquivo (FormData): quem monta o multipart e o cabeçalho com o separador é o `fetch`.
      ...(body !== undefined && !(body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(await options.getHeaders?.()),
    };
    let response: Response;
    const controller = new AbortController();
    const timer = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : null;
    try {
      response = await fetchFn(`${base}/api/v1${path}`, {
        method,
        headers,
        body:
          body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        // O cookie vai no cabeçalho; `include` pode atrapalhar no React Native.
        credentials: 'omit',
        signal: controller.signal,
      });
    } catch (error) {
      throw new ApiError('network_error', 'Sem conexão com o servidor', 0, error);
    } finally {
      if (timer) clearTimeout(timer);
    }
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorBodySchema.safeParse(json);
      throw parsed.success
        ? new ApiError(
            parsed.data.error.code,
            parsed.data.error.message,
            response.status,
            parsed.data.error.details,
          )
        : new ApiError('internal_error', `Erro ${response.status}`, response.status);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError('invalid_response', 'Resposta inesperada do servidor', response.status);
    }
    return parsed.data;
  }

  /** Pedido cuja resposta é texto puro (ex.: lista do deck para exportar). */
  async function requestText(path: string): Promise<string> {
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      ...(await options.getHeaders?.()),
    };
    let response: Response;
    try {
      response = await fetchFn(`${base}/api/v1${path}`, { headers, credentials: 'omit' });
    } catch (error) {
      throw new ApiError('network_error', 'Sem conexão com o servidor', 0, error);
    }
    if (!response.ok) {
      const parsed = errorBodySchema.safeParse(await response.json().catch(() => null));
      throw parsed.success
        ? new ApiError(parsed.data.error.code, parsed.data.error.message, response.status)
        : new ApiError('internal_error', `Erro ${response.status}`, response.status);
    }
    return response.text();
  }

  const q = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined),
    ).toString();
    return search ? `?${search}` : '';
  };

  return {
    me: {
      /** Envia a foto do perfil (FormData com o campo `file`); devolve a URL nova. */
      setAvatar: async (form: FormData) =>
        (await request('PUT', '/me/avatar', z.object({ image: z.string() }), form)).image,
      /** Tira a foto do perfil (volta às iniciais). */
      removeAvatar: async () =>
        (await request('DELETE', '/me/avatar', z.object({ image: z.null() }))).image,
      /** Grupos que mudam de dono (ou são apagados) se a pessoa excluir a conta. */
      deletionPreview: async () =>
        (
          await request(
            'GET',
            '/me',
            z.object({
              deletion: z.object({
                transfers: z.array(z.string()),
                deletions: z.array(z.string()),
              }),
            }),
          )
        ).deletion,
      /** Fuso, idioma e avisos por e-mail. */
      preferences: async () =>
        (await request('GET', '/me/preferences', z.object({ preferences: preferencesSchema })))
          .preferences,
      updatePreferences: async (input: {
        timeZone?: string;
        locale?: 'pt-BR' | 'en';
        emailNotifications?: boolean;
        municipalityCode?: string | null;
      }) =>
        (
          await request(
            'PUT',
            '/me/preferences',
            z.object({ preferences: preferencesSchema }),
            input,
          )
        ).preferences,
      /** Cidade do perfil (10.3), usada em "Lojas e eventos"; `null` tira. */
      setCity: async (municipalityCode: string | null) =>
        (
          await request('PUT', '/me/preferences', z.object({ preferences: preferencesSchema }), {
            municipalityCode,
          })
        ).preferences,
      /** Liga as notificações push neste aparelho (token do Expo). */
      registerPushToken: (token: string, platform: 'ios' | 'android') =>
        request('POST', '/me/push-tokens', z.object({ registered: z.literal(true) }), {
          token,
          platform,
        }),
      /** Desliga as notificações push neste aparelho. */
      removePushToken: (token: string) =>
        request('DELETE', '/me/push-tokens', z.object({ removed: z.literal(true) }), { token }),
      /** Guarda uma escolha do onboarding (ex.: dispensar a faixa do beta). */
      /** Estado do guia do primeiro acesso: abre sozinho? já foi feito? já está num grupo? */
      onboarding: async () =>
        (
          await request(
            'GET',
            '/me/onboarding',
            z.object({
              guide: z.object({ show: z.boolean(), done: z.boolean(), hasGroup: z.boolean() }),
            }),
          )
        ).guide,
      /**
       * Recursos liberados por flag (o app não avalia as flags da Vercel). Servidor antigo ou
       * resposta estranha: tudo desligado.
       */
      features: async () =>
        request(
          'GET',
          '/me/features',
          z.object({
            cardScanner: z.boolean().catch(false),
            tableColors: z.boolean().catch(false),
          }),
        ).catch(() => ({ cardScanner: false, tableColors: false })),
      /** Dicas das telas (análise de deck, modo mesa, coleção) que a pessoa já dispensou. */
      dismissedTips: async () =>
        (
          await request(
            'GET',
            '/me/onboarding',
            // Lista tolerante: dica nova no servidor não quebra uma versão antiga do app.
            z.object({ tips: z.array(z.string()) }),
          )
        ).tips.filter((id): id is TipId => (TIP_IDS as readonly string[]).includes(id)),
      markOnboarding: (
        flag:
          | 'checklist-dismissed'
          | 'guide-skipped'
          | 'guide-completed'
          | 'beta-banner-dismissed'
          | 'tip-deck-analysis'
          | 'tip-table'
          | 'tip-collection'
          | 'tip-ranking',
      ) => request('POST', '/me/onboarding', z.object({ flag: z.string() }), { flag }),
      /** Lições da trilha "Aprender a jogar" (12.1) já concluídas. */
      learnProgress: async () =>
        (await request('GET', '/me/learn', z.object({ completed: z.array(z.string()) }))).completed,
      /** Marca (ou desmarca) uma lição como concluída; devolve as concluídas. */
      setLessonCompleted: async (lessonId: string, completed: boolean) =>
        (
          await request('POST', '/me/learn', z.object({ completed: z.array(z.string()) }), {
            lessonId,
            completed,
          })
        ).completed,
      /** Central de notificações: as mais recentes e quantas ainda não foram lidas. */
      notifications: () =>
        request(
          'GET',
          '/me/notifications',
          z.object({ items: z.array(notificationSchema), unread: z.number() }),
        ),
      /** A central foi aberta: tudo o que chegou conta como lido. */
      markNotificationsRead: () => request('POST', '/me/notifications/read', z.unknown()),
      /** Marca uma notificação como lida. */
      markNotificationRead: (id: string) =>
        request('POST', `/me/notifications/${encodeURIComponent(id)}/read`, z.unknown()),
      /**
       * Conquistas ganhas desde a última vez que a pessoa viu (janela do painel e do perfil).
       * Conquistas que esta versão do app não conhece ficam de fora.
       */
      newAchievements: async () =>
        (
          await request(
            'GET',
            '/me/achievements/new',
            z.object({
              achievements: z.array(z.unknown()).transform((list) =>
                list.flatMap((a) => {
                  const parsed = achievementSchema.safeParse(a);
                  return parsed.success ? [parsed.data] : [];
                }),
              ),
            }),
          )
        ).achievements,
      /** A janela foi fechada: as conquistas mostradas contam como vistas. */
      markAchievementsSeen: (ids: readonly AchievementId[]) =>
        request('POST', '/me/achievements/seen', z.unknown(), { ids }),
      /** Exclui a conta (LGPD): dados pessoais apagados, partidas ficam anônimas. */
      deleteAccount: () =>
        request('DELETE', '/me', z.object({ deleted: z.literal(true) }).loose(), {
          confirm: true,
        }),
    },
    feedback: {
      /** Feedback do beta (8.4): problema, ideia ou outro assunto. */
      send: (input: {
        kind: 'problem' | 'idea' | 'other';
        message: string;
        page?: string | null;
        platform: 'ios' | 'android' | 'web';
      }) =>
        request('POST', '/feedback', z.object({ feedback: z.object({ id: z.string() }) }), input),
    },
    groups: {
      list: async () =>
        (await request('GET', '/groups', z.object({ groups: z.array(groupSchema) }))).groups,
      setActive: (groupId: string) =>
        request('PUT', '/me/active-group', z.object({ groupId: z.string() }), { groupId }),
      /** Cria um grupo (quem cria vira o dono). */
      create: async (name: string) =>
        (await request('POST', '/groups', z.object({ group: createdGroupSchema }), { name })).group,
      /** Faixa do beta (8.5): semana atual, ou `null` fora do beta (ou se a pessoa dispensou). */
      beta: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/beta`,
            z.object({
              beta: z
                .object({ week: z.number(), weeks: z.number(), endsAt: z.coerce.date() })
                .nullable(),
            }),
          )
        ).beta,
      /** Membros do grupo (para filtros por jogador e escolha de participantes). */
      /** Presença de cada membro e quem anda sumido (só dono e admins). */
      attendance: (groupId: string) =>
        request('GET', `/groups/${encodeURIComponent(groupId)}/attendance`, groupAttendanceSchema),
      /** Chama a pessoa para o próximo encontro (um aviso por pessoa por encontro). */
      nudge: (groupId: string, userId: string, eventId: string) =>
        request(
          'POST',
          `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/nudge`,
          z.object({ nudged: z.boolean() }),
          { eventId },
        ),
      /** Até 3 membros com quem você ainda não jogou (ou não joga há 30+ dias). */
      partners: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/partners`,
            z.object({ hints: z.array(partnerHintSchema) }),
          )
        ).hints,
      members: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/members`,
            z.object({ members: z.array(memberSchema) }),
          )
        ).members,
      /** Configurações do grupo (qualquer membro lê; dono/admin altera). */
      settings: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/settings`,
            z.object({ settings: groupSettingsSchema }),
          )
        ).settings,
      updateSettings: async (
        groupId: string,
        input: Partial<{
          tableSize: number;
          minDurationMinutes: number;
          pointsWin: number;
          pointsDraw: number;
          pointsLoss: number;
          defaultFormat: string;
        }>,
      ) =>
        (
          await request(
            'PATCH',
            `/groups/${encodeURIComponent(groupId)}/settings`,
            z.object({ settings: groupSettingsSchema }),
            input,
          )
        ).settings,
      /** Gera um novo código de convite (dono/admin); o link antigo deixa de funcionar. */
      regenerateInvite: async (groupId: string) =>
        (
          await request(
            'POST',
            `/groups/${encodeURIComponent(groupId)}/invite`,
            z.object({ inviteCode: z.string() }),
          )
        ).inviteCode,
      /** Promove a admin ou rebaixa a membro. */
      setRole: (groupId: string, userId: string, role: 'admin' | 'member') =>
        request(
          'PATCH',
          `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
          z.object({ role: z.enum(['admin', 'member']) }),
          { role },
        ),
      /** Remove um membro — ou sai do grupo, quando é o próprio usuário. */
      removeMember: (groupId: string, userId: string) =>
        request(
          'DELETE',
          `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
          z.object({ groupDeleted: z.boolean() }),
        ),
      /** Passa a posse do grupo (o dono atual vira admin). */
      transfer: (groupId: string, userId: string) =>
        request(
          'POST',
          `/groups/${encodeURIComponent(groupId)}/transfer`,
          z.object({ ownerId: z.string() }),
          { userId },
        ),
      /** Entra num grupo pelo código do convite. */
      join: async (inviteCode: string) =>
        (
          await request('POST', '/groups/join', z.object({ group: createdGroupSchema }), {
            inviteCode,
          })
        ).group,
    },
    events: {
      list: async (groupId: string, when: 'upcoming' | 'past' | 'all' = 'upcoming') =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/events${q({ when })}`,
            z.object({ events: z.array(eventSummarySchema) }),
          )
        ).events,
      /** Histórico de encontros passados: busca, situação, jogador e página (20 por vez). */
      history: async (
        groupId: string,
        filters: {
          q?: string;
          status?: 'scheduled' | 'finished' | 'cancelled';
          playerId?: string;
          page?: number;
        } = {},
      ) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/events/history${q({
              q: filters.q || undefined,
              status: filters.status,
              playerId: filters.playerId,
              page: filters.page && filters.page > 1 ? String(filters.page) : undefined,
            })}`,
            z.object({ history: eventHistorySchema }),
          )
        ).history,
      /** Confirmados e partidas de cada dupla (sugestão de mesas). */
      pairings: (eventId: string) =>
        request('GET', `/events/${encodeURIComponent(eventId)}/pairings`, eventPairingsSchema),
      get: async (eventId: string) =>
        (
          await request(
            'GET',
            `/events/${encodeURIComponent(eventId)}`,
            z.object({ event: eventDetailSchema }),
          )
        ).event,
      create: async (
        groupId: string,
        event: {
          title: string;
          startsAt: Date;
          endsAt?: Date | null;
          locationId?: string | null;
          participantIds?: string[];
        },
      ) =>
        (
          await request(
            'POST',
            `/groups/${encodeURIComponent(groupId)}/events`,
            z.object({ event: z.object({ id: z.string() }).loose() }),
            {
              ...event,
              startsAt: event.startsAt.toISOString(),
              endsAt: event.endsAt ? event.endsAt.toISOString() : null,
            },
          )
        ).event,
      /** Edita título, horário e local (quem criou ou admins). */
      update: async (
        eventId: string,
        input: {
          title?: string;
          startsAt?: Date;
          endsAt?: Date | null;
          locationId?: string | null;
        },
      ) =>
        (
          await request(
            'PATCH',
            `/events/${encodeURIComponent(eventId)}`,
            z.object({ event: z.object({ id: z.string() }).loose() }),
            {
              ...input,
              ...(input.startsAt ? { startsAt: input.startsAt.toISOString() } : {}),
              ...(input.endsAt !== undefined
                ? { endsAt: input.endsAt ? input.endsAt.toISOString() : null }
                : {}),
            },
          )
        ).event,
      /** Muda a situação do encontro: finalizar (dispara o resumo da noite), cancelar ou reabrir. */
      setStatus: async (eventId: string, status: 'scheduled' | 'cancelled' | 'finished') =>
        (
          await request(
            'PATCH',
            `/events/${encodeURIComponent(eventId)}`,
            z.object({ event: z.object({ id: z.string(), status: eventStatusSchema }).loose() }),
            { status },
          )
        ).event,
      rsvp: async (eventId: string, rsvp: Rsvp) =>
        (
          await request(
            'PUT',
            `/events/${encodeURIComponent(eventId)}/rsvp`,
            z.object({ rsvp: rsvpSchema }),
            { rsvp },
          )
        ).rsvp,
    },
    availability: {
      /** Disponibilidades do grupo no período (avulsas e ocorrências das regras semanais). */
      list: async (groupId: string, range: { from?: Date; to?: Date } = {}) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/availability${q({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
            })}`,
            z.object({ slots: z.array(availabilitySlotSchema) }),
          )
        ).slots,
      add: (
        groupId: string,
        slot: { startsAt: Date; endsAt: Date; locationIds?: string[]; note?: string | null },
      ) =>
        request(
          'POST',
          `/groups/${encodeURIComponent(groupId)}/availability`,
          z.object({ slot: z.object({ id: z.string() }).loose() }),
          {
            ...slot,
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
          },
        ),
      remove: (slotId: string) =>
        request('DELETE', `/availability/${encodeURIComponent(slotId)}`, z.unknown()),
      /** Melhores horários: janelas em que a mesa fecha. */
      windows: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/availability/windows`,
            z.object({ windows: z.array(gameWindowSchema) }),
          )
        ).windows,
    },
    rules: {
      list: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/availability-rules`,
            z.object({ rules: z.array(availabilityRuleSchema) }),
          )
        ).rules,
      add: (
        groupId: string,
        rule: {
          weekdays: number[];
          startTime: string;
          endTime: string;
          timeZone: string;
          locationIds?: string[];
          note?: string | null;
        },
      ) =>
        request(
          'POST',
          `/groups/${encodeURIComponent(groupId)}/availability-rules`,
          z.object({ rules: z.array(z.object({ id: z.string() }).loose()) }),
          rule,
        ),
      remove: (ruleId: string) =>
        request('DELETE', `/availability-rules/${encodeURIComponent(ruleId)}`, z.unknown()),
      /** Pula (ou volta a valer) uma data da regra semanal. */
      setException: (ruleId: string, date: string, skip: boolean) =>
        request(
          'PUT',
          `/availability-rules/${encodeURIComponent(ruleId)}/exceptions`,
          z.unknown(),
          { date, skip },
        ),
    },
    locations: {
      list: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/locations`,
            z.object({ locations: z.array(locationSchema) }),
          )
        ).locations,
      create: async (groupId: string, input: { name: string; address?: string | null }) =>
        (
          await request(
            'POST',
            `/groups/${encodeURIComponent(groupId)}/locations`,
            z.object({ location: locationSchema }),
            input,
          )
        ).location,
      remove: (groupId: string, locationId: string) =>
        request(
          'DELETE',
          `/groups/${encodeURIComponent(groupId)}/locations/${encodeURIComponent(locationId)}`,
          z.object({ deleted: z.boolean() }),
        ),
    },
    cards: {
      /** Sugestões de nomes de carta (Scryfall), para adicionar à coleção ou a um deck. */
      /**
       * Sugestões: nome em inglês (o que se guarda) e, quando a sugestão veio da busca em
       * português, o nome impresso ("Anel Solar" para Sol Ring).
       */
      autocomplete: async (query: string) => {
        const { names, printed } = await request(
          'GET',
          `/cards/autocomplete${q({ q: query })}`,
          z.object({
            names: z.array(z.string()),
            printed: z.record(z.string(), z.string()).optional(),
          }),
        );
        return names.map((name) => ({ name, printedName: printed?.[name] ?? null }));
      },
      /** Edições (impressões) de uma carta, mais novas primeiro. */
      prints: async (name: string) =>
        (
          await request(
            'GET',
            `/cards/prints${q({ name, v: '2' })}`,
            z.object({ prints: z.array(cardPrintSchema) }),
          )
        ).prints,
    },
    collection: {
      /** A coleção inteira (filtros e ordem ficam no app). */
      list: async () =>
        (await request('GET', '/collection', z.object({ cards: z.array(collectionEntrySchema) })))
          .cards,
      /** Acrescenta cópias de uma carta pelo nome (ou pela impressão). */
      add: (input: { name: string; quantity: number; foil?: boolean; scryfallId?: string }) =>
        request(
          'POST',
          '/collection',
          z.object({ added: z.literal(true), name: z.string() }),
          input,
        ),
      /** Quantidade (0 remove), foil ou impressão de uma linha. */
      update: (
        entryId: string,
        input: { quantity?: number; foil?: boolean; scryfallId?: string; copies?: number },
      ) =>
        request(
          'PATCH',
          `/collection/${encodeURIComponent(entryId)}`,
          z.object({}).loose().or(z.null()),
          input,
        ),
      remove: (entryId: string) =>
        request(
          'DELETE',
          `/collection/${encodeURIComponent(entryId)}`,
          z.null().or(z.object({}).loose()),
        ),
    },
    games: {
      /** Registra uma partida no encontro. */
      record: async (eventId: string, game: GameInput) =>
        (
          await request(
            'POST',
            `/events/${encodeURIComponent(eventId)}/games`,
            z.object({ game: z.object({ id: z.string() }).loose() }),
            game,
          )
        ).game,
      /** Apaga uma partida (quem registrou ou admins); a resposta vem vazia (204). */
      remove: (gameId: string) =>
        request(
          'DELETE',
          `/games/${encodeURIComponent(gameId)}`,
          z.null().or(z.object({}).loose()),
        ),
      /** Edita a partida inteira (quem registrou ou admins). */
      update: async (gameId: string, game: GameInput) =>
        (
          await request(
            'PUT',
            `/games/${encodeURIComponent(gameId)}`,
            z.object({ game: z.object({ id: z.string() }).loose() }),
            game,
          )
        ).game,
    },
    table: {
      /** Jogadores, decks e formato padrão para o modo mesa. */
      get: async (eventId: string) =>
        (
          await request(
            'GET',
            `/events/${encodeURIComponent(eventId)}/table`,
            z.object({ table: tableSetupSchema }),
          )
        ).table,
    },
    players: {
      /** Perfil: resumo, títulos, grupos em comum, conquistas e decks visíveis para quem pede. */
      get: async (userId: string) =>
        (
          await request(
            'GET',
            `/players/${encodeURIComponent(userId)}`,
            z.object({ player: playerProfileSchema }),
          )
        ).player,
    },
    /** Cidades do IBGE pelo começo do nome (10.3). */
    municipalities: {
      search: async (query: string) =>
        (
          await request(
            'GET',
            `/municipalities?q=${encodeURIComponent(query)}`,
            z.object({ municipalities: z.array(municipalitySchema) }),
          )
        ).municipalities,
    },
    /** Lojas e eventos por perto (10.3): pela cidade (`uf/cidade`) ou pela posição. */
    discovery: {
      near: (
        origin: { city: string } | { lat: number; lng: number },
        filters: {
          formats?: string[];
          kinds?: ('tournament' | 'casual')[];
          offers?: string[];
        } = {},
      ) => {
        const params = new URLSearchParams(
          'city' in origin
            ? { city: origin.city }
            : { lat: String(origin.lat), lng: String(origin.lng) },
        );
        for (const [key, values] of Object.entries(filters)) {
          if (values?.length) params.set(key, values.join(','));
        }
        return request('GET', `/discovery?${params}`, discoverySchema);
      },
    },
    /** Perfis de loja (10.1). */
    stores: {
      /** Segue a loja (10.4): eventos novos e avisos chegam no sino. */
      follow: async (storeId: string) =>
        (
          await request(
            'PUT',
            `/stores/${encodeURIComponent(storeId)}/follow`,
            z.object({ following: z.boolean() }),
          )
        ).following,
      /** Deixa de seguir a loja. */
      unfollow: async (storeId: string) =>
        (
          await request(
            'DELETE',
            `/stores/${encodeURIComponent(storeId)}/follow`,
            z.object({ following: z.boolean() }),
          )
        ).following,
      /** Envia o logo da loja (dono ou equipe; FormData com o campo `file`). */
      setLogo: async (storeId: string, form: FormData) =>
        (
          await request(
            'PUT',
            `/stores/${encodeURIComponent(storeId)}/logo`,
            z.object({ logoUrl: z.string() }),
            form,
          )
        ).logoUrl,
      get: (slug: string) =>
        request(
          'GET',
          `/stores/by-slug/${encodeURIComponent(slug)}`,
          z.object({
            store: storePublicSchema,
            upcoming: z.array(storeEventSummarySchema),
            /** Se quem pede segue a loja (10.4). */
            following: z.boolean().optional(),
          }),
        ),
    },
    /** Eventos de loja (10.2): ver, inscrever-se, desistir, código do balcão e os meus. */
    storeEvents: {
      get: (id: string) =>
        request(
          'GET',
          `/store-events/${encodeURIComponent(id)}`,
          z.object({ event: storeEventSchema, tournamentId: z.string().nullable() }),
        ),
      register: async (id: string) =>
        (
          await request(
            'POST',
            `/store-events/${encodeURIComponent(id)}/entries`,
            z.object({ entry: storeEntryResultSchema }),
          )
        ).entry,
      leave: (entryId: string) =>
        request('DELETE', `/store-entries/${encodeURIComponent(entryId)}`, z.unknown()),
      byCode: async (code: string) =>
        (
          await request(
            'POST',
            '/store-events/by-code',
            z.object({ entry: storeEntryResultSchema }),
            { code },
          )
        ).entry,
      mine: async () =>
        (
          await request(
            'GET',
            '/me/store-events',
            z.object({ entries: z.array(myStoreEntrySchema) }),
          )
        ).entries,
    },
    /** Torneios do grupo (9.1), em qualquer formato. */
    tournaments: {
      list: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/tournaments`,
            z.object({ tournaments: z.array(tournamentSummarySchema) }),
          )
        ).tournaments,
      get: (id: string) =>
        request('GET', `/tournaments/${encodeURIComponent(id)}`, tournamentViewSchema),
      create: async (
        eventId: string,
        input: {
          name: string;
          format: string;
          bestOf?: 1 | 3;
          rounds?: number | null;
          points?: { win: number; draw: number; loss: number };
          countsInRanking?: boolean;
          /** Top cut depois do suíço (9.2). */
          topCut?: number | null;
          /** Estrutura (9.4). */
          structure?: 'swiss' | 'single_elimination' | 'double_elimination' | 'round_robin';
        },
      ) =>
        (
          await request(
            'POST',
            `/events/${encodeURIComponent(eventId)}/tournaments`,
            z.object({ tournament: z.object({ id: z.string() }).loose() }),
            input,
          )
        ).tournament,
      addEntrant: (id: string, memberIds: string[]) =>
        request('POST', `/tournaments/${encodeURIComponent(id)}/entrants`, z.unknown(), {
          memberIds,
        }),
      removeEntrant: (id: string, entrantId: string) =>
        request(
          'DELETE',
          `/tournaments/${encodeURIComponent(id)}/entrants/${encodeURIComponent(entrantId)}`,
          z.unknown(),
        ),
      start: (id: string) =>
        request('POST', `/tournaments/${encodeURIComponent(id)}/start`, z.unknown()),
      next: (id: string) =>
        request(
          'POST',
          `/tournaments/${encodeURIComponent(id)}/next`,
          z.object({ finished: z.boolean() }).loose(),
        ),
      report: (
        id: string,
        tableId: string,
        result: {
          gameWins: Record<string, number>;
          gameDraws: number;
          /** Do modo mesa: valem quando a mesa vira uma partida só. */
          details?: {
            firstPlayerId?: string | null;
            winningTurn?: number | null;
            durationMinutes?: number | null;
          };
        },
      ) =>
        request(
          'PUT',
          `/tournaments/${encodeURIComponent(id)}/tables/${encodeURIComponent(tableId)}`,
          z.unknown(),
          result,
        ),
      remove: (id: string) =>
        request('DELETE', `/tournaments/${encodeURIComponent(id)}`, z.unknown()),
    },
    stats: {
      /** Estatísticas do grupo: sequências, comandantes em alta, atividade por mês. */
      get: async (groupId: string, filters: { from?: Date; to?: Date; format?: string } = {}) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/stats${q({
              from: filters.from?.toISOString(),
              to: filters.to?.toISOString(),
              format: filters.format,
            })}`,
            z.object({ stats: groupStatsSchema }),
          )
        ).stats,
      /** Recordes e "cara do grupo" (8.12). */
      records: (groupId: string) =>
        request('GET', `/groups/${encodeURIComponent(groupId)}/records`, groupRecordsSchema),
      /** Endereço da retrospectiva do mês com o código de acesso (abre no navegador, sem login). */
      monthlyLink: async (groupId: string, month: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/monthly-link${q({ month })}`,
            z.object({ url: z.string() }),
          )
        ).url,
    },
    seasons: {
      list: async (groupId: string) =>
        (
          await request(
            'GET',
            `/groups/${encodeURIComponent(groupId)}/seasons`,
            z.object({ seasons: z.array(seasonSchema) }),
          )
        ).seasons,
      /** Cria uma temporada (dono/admin); `endsAt` é exclusivo (dia seguinte ao último, 00:00). */
      create: async (groupId: string, input: { name: string; startsAt: Date; endsAt: Date }) =>
        (
          await request(
            'POST',
            `/groups/${encodeURIComponent(groupId)}/seasons`,
            z.object({ season: seasonSchema }),
            {
              name: input.name,
              startsAt: input.startsAt.toISOString(),
              endsAt: input.endsAt.toISOString(),
            },
          )
        ).season,
      remove: (seasonId: string) =>
        request(
          'DELETE',
          `/seasons/${encodeURIComponent(seasonId)}`,
          z.null().or(z.object({}).loose()),
        ),
    },
    ranking: {
      get: (groupId: string, filters: { from?: Date; to?: Date; format?: string } = {}) =>
        request(
          'GET',
          `/groups/${encodeURIComponent(groupId)}/ranking${q({
            from: filters.from?.toISOString(),
            to: filters.to?.toISOString(),
            format: filters.format,
          })}`,
          rankingSchema,
        ),
    },
    decks: {
      /**
       * Comparação com outros decks do mesmo comandante (4.10): médias, cartas comuns que faltam
       * e escolhas próprias. Sem comandante (ou servidor antigo), `null`.
       */
      comparison: async (deckId: string) =>
        (
          await request(
            'GET',
            `/decks/${encodeURIComponent(deckId)}/comparison`,
            z.object({ comparison: deckComparisonSchema.nullable().catch(null) }),
          ).catch(() => ({ comparison: null }))
        ).comparison,
      /** Cartas alternativas para uma função do deck (4.6), até o custo `maxCmc`. */
      alternatives: async (deckId: string, role: string, maxCmc: number) =>
        request(
          'GET',
          `/decks/${encodeURIComponent(deckId)}/alternatives${q({ role, maxCmc: String(maxCmc) })}`,
          z.object({
            query: z.string(),
            cards: z.array(
              z
                .object({
                  name: z.string(),
                  manaCost: z.string().nullable().optional(),
                  typeLine: z.string().nullable().optional(),
                  imageUri: z.string().nullable().optional(),
                })
                .loose(),
            ),
          }),
        ),
      list: async () =>
        (await request('GET', '/decks', z.object({ decks: z.array(deckSummarySchema) }))).decks,
      /** Importa pelo link (Archidekt) ou por uma lista colada; devolve o deck e as cartas não achadas. */
      import: (
        input:
          | { kind: 'url'; url: string; name?: string; format?: string; draft?: boolean }
          | { kind: 'text'; text: string; name?: string; format?: string; draft?: boolean },
      ) =>
        request(
          'POST',
          '/decks',
          z.object({ deck: z.object({ id: z.string() }).loose(), notFound: z.array(z.string()) }),
          input,
        ),
      /** Deck do zero (11.1): nome, formato, comandante opcional; rascunho por padrão (11.2). */
      create: async (input: {
        name: string;
        format: string;
        commander?: string;
        draft?: boolean;
      }) =>
        (
          await request(
            'POST',
            '/decks',
            z.object({ deck: z.object({ id: z.string() }).loose() }),
            { kind: 'empty', ...input },
          )
        ).deck,
      /**
       * Publica o rascunho: as cartas entram na coleção (dono). `choices`: por carta com cópias
       * livres na coleção, usar uma delas (`use`) ou entrar como nova (`use: null`).
       */
      publish: async (
        deckId: string,
        choices: {
          name: string;
          board: string;
          fromScryfallId: string | null;
          use: { scryfallId: string | null; foil: boolean } | null;
        }[] = [],
        /** Quem vê o deck publicado; sem escolha, o grupo. */
        visibility?: 'private' | 'group' | 'public',
      ) =>
        (
          await request(
            'POST',
            `/decks/${encodeURIComponent(deckId)}/publish`,
            z.object({ deck: z.object({ id: z.string() }).loose() }),
            { choices, ...(visibility ? { visibility } : {}) },
          )
        ).deck,
      /** Move todas as cópias de uma carta para outro board, ou remove (`to: null`). Dono. */
      moveCard: (deckId: string, input: { name: string; from: string; to: string | null }) =>
        request(
          'POST',
          `/decks/${encodeURIComponent(deckId)}/lines/move`,
          z.object({ moved: z.number() }),
          input,
        ),
      /** Cartas do deck que você já tem livres na coleção, em qualquer edição (dono). */
      collectionMatches: async (deckId: string) =>
        (
          await request(
            'GET',
            `/decks/${encodeURIComponent(deckId)}/collection-matches`,
            z.object({
              matches: z.array(
                z.object({
                  name: z.string(),
                  free: z.number(),
                  options: z.array(
                    z
                      .object({
                        scryfallId: z.string().nullable(),
                        foil: z.boolean(),
                        free: z.number(),
                        setCode: z.string().nullable(),
                        setName: z.string().nullable(),
                      })
                      .loose(),
                  ),
                }),
              ),
            }),
          )
        ).matches,
      /** Nome, tipo de jogo e quem vê (dono). */
      update: async (
        deckId: string,
        input: { name?: string; format?: string; visibility?: 'private' | 'group' | 'public' },
      ) =>
        (
          await request(
            'PATCH',
            `/decks/${encodeURIComponent(deckId)}`,
            z.object({ deck: z.object({ id: z.string() }).loose() }),
            input,
          )
        ).deck,
      /** Apaga o deck (dono); resposta vazia. */
      remove: (deckId: string) =>
        request(
          'DELETE',
          `/decks/${encodeURIComponent(deckId)}`,
          z.null().or(z.object({}).loose()),
        ),
      /** Atualiza pela origem ou por uma lista colada; proxies continuam marcados. */
      sync: (deckId: string, text?: string) =>
        request(
          'POST',
          `/decks/${encodeURIComponent(deckId)}/sync`,
          z
            .object({
              added: z.array(z.string()),
              removed: z.array(z.string()),
              changed: z.array(z.string()),
            })
            .loose(),
          text ? { text } : {},
        ),
      /** Lista em texto (Moxfield/Archidekt/Arena); `proxies` marca cópias proxy com #proxy. */
      exportText: (deckId: string, format: 'plain' | 'proxies' = 'plain') =>
        requestText(`/decks/${encodeURIComponent(deckId)}/export${q({ format })}`),
      /** Quantidade (0 remove), proxies e edição de uma carta num board; `found` avisa se a carta existe. */
      setLine: (
        deckId: string,
        input: {
          name: string;
          board: string;
          quantity: number;
          proxies: number;
          scryfallId?: string | null;
        },
      ) =>
        request(
          'PUT',
          `/decks/${encodeURIComponent(deckId)}/lines`,
          z.object({ found: z.boolean() }).loose(),
          input,
        ),
      /** Adiciona cópias de uma carta pelo nome (impressão padrão do Scryfall). */
      addCard: (
        deckId: string,
        input: { name: string; board: string; quantity: number; proxies: number },
      ) =>
        request(
          'POST',
          `/decks/${encodeURIComponent(deckId)}/lines`,
          z.object({ found: z.boolean() }).loose(),
          input,
        ),
      /** Troca a edição de parte das cópias de uma linha. */
      changePrint: (
        deckId: string,
        input: {
          name: string;
          board: string;
          fromScryfallId: string | null;
          toScryfallId: string;
          quantity: number;
        },
      ) =>
        request(
          'POST',
          `/decks/${encodeURIComponent(deckId)}/lines/print`,
          z.object({}).loose().or(z.null()),
          input,
        ),
      /** Deck com cartas e análise (quem pode ver o deck). */
      get: async (deckId: string) =>
        (
          await request(
            'GET',
            `/decks/${encodeURIComponent(deckId)}`,
            z.object({ deck: deckDetailSchema }),
          )
        ).deck,
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
