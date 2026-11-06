import 'server-only';
import { fetchUsdBrlRate, type ExchangeRate } from '@boramarcar/core';

const TTL_MS = 6 * 60 * 60 * 1000;
let cached: { value: ExchangeRate; at: number } | null = null;

/**
 * Cotação do dólar (PTAX do Banco Central), guardada por 6 h por instância.
 * Se o BCB estiver fora, devolve a última conhecida ou `null` (a página mostra só US$).
 */
export async function getUsdBrlRate(fetchFn: typeof fetch = fetch): Promise<ExchangeRate | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const value = await fetchUsdBrlRate((url, init) =>
      fetchFn(url, { ...init, signal: AbortSignal.timeout(4000) }),
    );
    cached = { value, at: Date.now() };
    return value;
  } catch (error) {
    console.warn('[cambio] PTAX indisponível', error);
    return cached?.value ?? null;
  }
}

/** Só para testes. */
export const resetRateCache = () => {
  cached = null;
};
