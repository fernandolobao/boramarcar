import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'db',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Cada arquivo cria seu próprio Postgres em memória (PGlite); a inicialização é mais lenta.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
