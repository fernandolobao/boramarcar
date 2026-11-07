import { DomainError, fetchAddressSuggestions, isDomainError } from '@boramarcar/core';
import { z } from 'zod';
import { authed, parseQuery } from '@/server/http';

const schema = z.object({
  q: z.string().max(200).default(''),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

/** Cache curto em memória: a mesma busca não vai de novo ao Photon (uso justo do serviço). */
const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 24 * 60 * 60 * 1000;

/** Autocompletar de endereço (2.14) pelo Photon/OpenStreetMap, só para quem entrou. */
export const GET = authed(async ({ req }) => {
  const { q, lat, lng } = parseQuery(req, schema);
  const near = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  const key = `${q.trim().toLowerCase()}|${near ? `${lat?.toFixed(1)},${lng?.toFixed(1)}` : ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { suggestions: hit.value };
  try {
    const suggestions = await fetchAddressSuggestions(q, { fetch, near });
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), value: suggestions });
    return { suggestions };
  } catch (error) {
    if (isDomainError(error)) throw error;
    console.warn('[places] busca de endereços indisponível', error);
    throw new DomainError('upstream_error', 'Busca de endereços indisponível');
  }
});
