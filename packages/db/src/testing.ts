import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import type { Database } from './client';
import * as schema from './schema';
import { user } from './schema';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

/**
 * Cria um Postgres em memória (PGlite) com todas as migrations aplicadas.
 * Usado nos testes de integração: rápido, isolado e sem Docker.
 */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return {
    db: db as unknown as Database,
    close: () => client.close(),
  };
}

let userCounter = 0;

export async function createTestUser(
  db: Database,
  overrides: Partial<typeof user.$inferInsert> = {},
) {
  userCounter += 1;
  const [created] = await db
    .insert(user)
    .values({
      id: `user-${userCounter}-${crypto.randomUUID().slice(0, 8)}`,
      name: `Jogador ${userCounter}`,
      email: `jogador${userCounter}-${crypto.randomUUID().slice(0, 8)}@example.com`,
      emailVerified: true,
      ...overrides,
    })
    .returning();
  return created!;
}
