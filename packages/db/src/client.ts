import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { normalizeConnectionString } from './connection';
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
  const pool = new Pool({
    connectionString: normalizeConnectionString(connectionString),
    max: options.max ?? 5,
    // Sem resposta do banco: falha em 5 s em vez de prender a função até o tempo dela acabar.
    connectionTimeoutMillis: 5_000,
    // O Neon fecha conexões paradas; o pool larga as ociosas antes disso.
    idleTimeoutMillis: 10_000,
    // Nenhuma consulta de tela passa disso; uma que trave não segura a conexão.
    statement_timeout: 15_000,
  });
  // Erro numa conexão ociosa (ex.: o Neon a derrubou) chega aqui. Sem este ouvinte, o Node trata
  // como erro não tratado e derruba o processo; com ele, a conexão sai do pool e a próxima é nova.
  pool.on('error', (error) => {
    console.error('[db] conexão ociosa do pool falhou:', error.message);
  });
  const db = drizzle(pool, { schema });
  return { db: db as unknown as Database, pool };
}
