import 'server-only';
import { DomainError, type DomainErrorCode } from '@boramarcar/core';
import type { Database } from '@boramarcar/db';
import { z } from 'zod';
import { getDb } from './db';
import { getSessionUser, type SessionUser } from './session';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  upstream_error: 502,
};

export interface ApiErrorBody {
  error: { code: DomainErrorCode | 'internal_error'; message: string; details?: unknown };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, details: error.details },
    };
    return Response.json(body, { status: STATUS_BY_CODE[error.code] });
  }
  if (error instanceof z.ZodError) {
    const body: ApiErrorBody = {
      error: { code: 'invalid_input', message: 'Dados inválidos', details: z.flattenError(error) },
    };
    return Response.json(body, { status: 400 });
  }
  console.error(error);
  const body: ApiErrorBody = { error: { code: 'internal_error', message: 'Erro inesperado' } };
  return Response.json(body, { status: 500 });
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new DomainError('invalid_input', 'JSON inválido');
  }
  return schema.parse(raw);
}

export function parseQuery<T extends z.ZodType>(req: Request, schema: T): z.infer<T> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

export interface HandlerContext<P> {
  req: Request;
  params: P;
  user: SessionUser;
  db: Database;
}

type RouteContext<P> = { params: Promise<P> };

/**
 * Envolve um route handler: exige sessão, injeta o banco e converte erros em JSON.
 * O retorno do handler vira `Response.json` (ou é usado direto se já for um `Response`).
 */
export function authed<P = Record<string, never>>(
  handler: (ctx: HandlerContext<P>) => Promise<unknown>,
  options: { status?: number } = {},
) {
  return async (req: Request, ctx: RouteContext<P>): Promise<Response> => {
    try {
      const user = await getSessionUser(req.headers);
      if (!user) throw new DomainError('unauthorized', 'Faça login para continuar');
      const result = await handler({ req, params: await ctx.params, user, db: getDb() });
      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });
      return Response.json(result, { status: options.status ?? 200 });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Schemas reutilizáveis. */
export const isoDate = z.coerce.date();
