import { defineConfig } from 'drizzle-kit';
import { migrationDatabaseUrl } from './src/connection';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: migrationDatabaseUrl() ?? 'postgres://boramarcar:boramarcar@localhost:5432/boramarcar',
  },
  strict: true,
  verbose: true,
});
