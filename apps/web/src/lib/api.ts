export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Chamada à API REST do app (`/api/v1/...`). Lança `ApiError` em respostas de erro. */
export async function api<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: undefined })
    | { error: { code: string; message: string; details?: unknown } }
    | null;
  if (!response.ok || !data || data.error) {
    const error = data?.error ?? { code: 'internal_error', message: response.statusText };
    throw new ApiError(response.status, error.code, error.message, error.details);
  }
  return data as T;
}
