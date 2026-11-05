import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema';

/** Tipo comum a todos os drivers usados (node-postgres em produção, PGlite nos testes). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface CreateDbOptions {
  /** Conexões máximas por instância. Em funções serverless, mantenha baixo. */
  max?: number;
}

/**
 * Cria o cliente do banco usando node-postgres. Funciona com Neon (use a URL "pooled"),
 * Postgres local (Docker) e qualquer Postgres compatível.
 */
export function createDb(connectionString: string, options: CreateDbOptions = {}) {
  const pool = new Pool({ connectionString, max: options.max ?? 5 });
  const db = drizzle(pool, { schema });
  return { db: db as unknown as Database, pool };
}
