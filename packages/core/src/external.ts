import { DomainError } from './errors';
import type { FetchLike } from './decks/types';

/** Tempo máximo de espera por serviço externo (ms). */
export const EXTERNAL_TIMEOUT_MS = {
  scryfall: 8_000,
  tagger: 8_000,
  spellbook: 10_000,
  importer: 10_000,
  places: 5_000,
  ptax: 4_000,
  email: 8_000,
  push: 8_000,
} as const;

/**
 * Chamada a um serviço externo com tempo máximo: sem resposta a tempo (ou sem rede), vira
 * `upstream_error` em vez de deixar a função do servidor esperando até o limite da Vercel.
 * Um `signal` já informado pelo chamador continua valendo junto com o do tempo máximo.
 */
export function withTimeout(fetchFn: FetchLike, timeoutMs: number, service: string): FetchLike {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      return await fetchFn(input, { ...init, signal });
    } catch (error) {
      if (error instanceof DomainError) throw error;
      const timedOut = timeout.aborted;
      throw new DomainError(
        'upstream_error',
        timedOut ? `${service} não respondeu em ${timeoutMs / 1000} s` : `${service} indisponível`,
        { service, timeout: timedOut },
      );
    }
  };
}

/** Tamanho máximo de uma resposta de importador (um deck grande em JSON tem ~1 MB). */
export const MAX_IMPORT_RESPONSE_BYTES = 5 * 1024 * 1024;

/**
 * Lê o JSON de uma resposta externa com tamanho máximo: recusa pelo `Content-Length` e, sem
 * ele, para de ler no limite. Assim uma resposta enorme (ou infinita) não ocupa a memória da
 * função até o fim do tempo máximo.
 */
export async function readJsonLimited(
  response: Response,
  { maxBytes = MAX_IMPORT_RESPONSE_BYTES, service }: { maxBytes?: number; service: string },
): Promise<unknown> {
  const tooBig = () =>
    new DomainError('upstream_error', `${service} respondeu com dados grandes demais`, {
      service,
      maxBytes,
    });
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw tooBig();
  }
  if (!response.body) return response.json();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooBig();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new DomainError('upstream_error', `${service} respondeu algo que não é JSON`, {
      service,
    });
  }
}
