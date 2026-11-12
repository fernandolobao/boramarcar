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
