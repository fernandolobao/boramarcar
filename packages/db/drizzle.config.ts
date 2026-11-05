import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://boramarcar:boramarcar@localhost:5432/boramarcar',
  },
  strict: true,
  verbose: true,
});
