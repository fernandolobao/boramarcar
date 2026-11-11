import { DomainError } from '@boramarcar/core';
import { eq, lt, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { externalCache, rateLimits } from '../schema';

/**
 * Valor de um serviço externo com cache compartilhado no banco (`external_cache`): dentro da
 * validade, nem chama o serviço; vencido, chama e guarda o novo. Se o serviço falhar e houver um
 * valor vencido, ele é usado como reserva (melhor um preço de ontem que um erro).
 */
export async function cachedExternal<T>(
  db: Database,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  now = new Date(),
): Promise<T> {
  const [row] = await db.select().from(externalCache).where(eq(externalCache.key, key)).limit(1);
  if (row && row.expiresAt > now) return row.value as T;
  let value: T;
  try {
    value = await load();
  } catch (error) {
    if (row) return row.value as T;
    throw error;
  }
  const expiresAt = new Date(now.getTime() + ttlMs);
  await db
    .insert(externalCache)
    .values({ key, value: value as unknown, expiresAt, updatedAt: now })
    .onConflictDoUpdate({
      target: externalCache.key,
      set: { value: value as unknown, expiresAt, updatedAt: now },
    });
  return value;
}

/**
 * Limite de uso por janela fixa: conta mais uma chamada para `key` e recusa (`rate_limited`,
 * com `retryAfterSeconds`) quando passa de `limit` na janela atual.
 */
export async function consumeRateLimit(
  db: Database,
  key: string,
  options: { limit: number; windowMs: number },
  now = new Date(),
) {
  const windowStart = new Date(Math.floor(now.getTime() / options.windowMs) * options.windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  if ((row?.count ?? 0) > options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStart.getTime() + options.windowMs - now.getTime()) / 1000),
    );
    throw new DomainError('rate_limited', 'Muitas tentativas em pouco tempo', {
      retryAfterSeconds,
    });
  }
}

/**
 * Limpeza (cron diário): apaga cache vencido há mais de `keepStaleMs` (fica um tempo como
 * reserva) e janelas de limite de uso com mais de um dia.
 */
export async function purgeExternalData(
  db: Database,
  options: { keepStaleMs?: number } = {},
  now = new Date(),
) {
  const keep = options.keepStaleMs ?? 30 * 24 * 60 * 60 * 1000;
  const cache = await db
    .delete(externalCache)
    .where(lt(externalCache.expiresAt, new Date(now.getTime() - keep)))
    .returning({ key: externalCache.key });
  const limits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - 24 * 60 * 60 * 1000)))
    .returning({ key: rateLimits.key });
  return { cache: cache.length, rateLimits: limits.length };
}
