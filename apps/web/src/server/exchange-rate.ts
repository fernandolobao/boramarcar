import 'server-only';
import { fetchUsdBrlRate, type ExchangeRate } from '@boramarcar/core';
import { cachedExternal, type Database } from '@boramarcar/db';
import { getDb } from './db';

const TTL_MS = 6 * 60 * 60 * 1000;
let cached: { value: ExchangeRate; at: number } | null = null;

/**
 * Cotação do dólar (PTAX do Banco Central), guardada por 6 h: primeiro na memória da instância,
 * depois no cache compartilhado do banco (`external_cache`), que sobrevive aos "cold starts" e
 * vale para todas as instâncias. Se o BCB estiver fora, devolve a última conhecida ou `null` (a
 * página mostra só US$).
 */
export async function getUsdBrlRate(
  options: { db?: Database | null; fetch?: typeof fetch } = {},
): Promise<ExchangeRate | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const fetchFn = options.fetch ?? fetch;
  const load = () => fetchUsdBrlRate((url, init) => fetchFn(url, init));
  try {
    const db = options.db === undefined ? getDb() : options.db;
    const value = db ? await cachedExternal(db, 'ptax:usd-brl', TTL_MS, load) : await load();
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
