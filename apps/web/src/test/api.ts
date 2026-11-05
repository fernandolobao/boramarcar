import type { Database } from '@boramarcar/db';
import { vi } from 'vitest';
import type { SessionUser } from '@/server/session';

/**
 * Estado compartilhado pelos mocks de sessão e banco nos testes de integração das rotas.
 * Uso: `vi.mock('@/server/session', () => sessionMock)` e `vi.mock('@/server/db', () => dbMock)`.
 */
export const testState: { db: Database | null; user: SessionUser | null } = {
  db: null,
  user: null,
};

export const sessionMock = {
  getSessionUser: vi.fn(async () => testState.user),
};

export const dbMock = {
  getDb: () => {
    if (!testState.db) throw new Error('testState.db não inicializado');
    return testState.db;
  },
};

export const asUser = (user: { id: string; name: string; email: string }) => {
  testState.user = { ...user, image: null };
};

/** Corpo de resposta JSON solto, para asserções nos testes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonBody = Record<string, any>;

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

/** Chama um route handler como o Next faria. */
export async function call<P = Record<string, never>>(
  handler: Handler<P>,
  options: { method?: string; path?: string; body?: unknown; params?: P } = {},
) {
  const url = `http://localhost${options.path ?? '/'}`;
  const req = new Request(url, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  });
  const res = await handler(req, { params: Promise.resolve((options.params ?? {}) as P) });
  const text = await res.text();
  return {
    status: res.status,
    body: text ? (JSON.parse(text) as JsonBody) : null,
    headers: res.headers,
  };
}
