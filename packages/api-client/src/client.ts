import { z } from 'zod';
import {
  deckSummarySchema,
  errorBodySchema,
  eventDetailSchema,
  eventSummarySchema,
  groupSchema,
  rankingSchema,
  rsvpSchema,
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
  /** Origem do servidor, ex.: `https://boramarcar.vercel.app` (sem barra no fim). */
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
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
