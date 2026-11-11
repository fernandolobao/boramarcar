import { z } from 'zod';
import {
  availabilityRuleSchema,
  deckDetailSchema,
  availabilitySlotSchema,
  deckSummarySchema,
  errorBodySchema,
  eventDetailSchema,
  eventSummarySchema,
  gameWindowSchema,
  groupSchema,
  locationSchema,
  rankingSchema,
  rsvpSchema,
  tableSetupSchema,
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
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
        body: body !== undefined ? JSON.stringify(body) : undefined,
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

  const q = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined),
    ).toString();
    return search ? `?${search}` : '';
  };

  return {
    groups: {
      list: async () =>
        (await request('GET', '/groups', z.object({ groups: z.array(groupSchema) }))).groups,
      setActive: (groupId: string) =>
        request('PUT', '/me/active-group', z.object({ groupId: z.string() }), { groupId }),
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
      list: async () =>
        (await request('GET', '/decks', z.object({ decks: z.array(deckSummarySchema) }))).decks,
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
