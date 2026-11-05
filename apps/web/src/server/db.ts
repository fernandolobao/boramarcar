import 'server-only';
import { createDb, type Database } from '@boramarcar/db';
import { getEnv } from '@/env';

const globalForDb = globalThis as unknown as { __boramarcarDb?: Database };

/** Instância única do banco por processo (reaproveitada entre invocações e no HMR). */
export function getDb(): Database {
  if (!globalForDb.__boramarcarDb) {
    globalForDb.__boramarcarDb = createDb(getEnv().DATABASE_URL).db;
  }
  return globalForDb.__boramarcarDb;
}
