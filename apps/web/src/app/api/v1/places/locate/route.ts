import { DomainError, isDomainError, locateAddress } from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({ q: z.string().min(3).max(200) });

/** Cache em memória: o Nominatim pede no máximo uma busca por segundo e nada repetido. */
const cache = new Map<string, { at: number; value: { lat: number; lng: number } | null }>();
const TTL = 24 * 60 * 60 * 1000;

/** Ponto exato de um endereço com número (2.14), pelo Nominatim/OpenStreetMap; `null` se não achar. */
export const GET = authed(async ({ req }) => {
  const { q } = parseQuery(req, schema);
  const key = q.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { point: hit.value };
  try {
    const point = await locateAddress(q, { fetch });
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), value: point });
    return { point };
  } catch (error) {
    if (isDomainError(error)) throw error;
    console.warn('[places] localização de endereço indisponível', error);
    throw new DomainError('upstream_error', 'Busca de endereços indisponível');
  }
});
