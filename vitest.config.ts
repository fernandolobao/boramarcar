import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/web'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['packages/*/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/index.ts',
        '**/test/**',
        'apps/web/src/app/**/{page,layout,not-found}.tsx',
      ],
      // Limites mínimos: a CI falha se a cobertura cair abaixo deles.
      thresholds: {
        lines: 60,
        functions: 50,
        branches: 60,
        statements: 60,
        'packages/core/src/**': { lines: 90, functions: 90, branches: 80, statements: 90 },
        'packages/db/src/services/**': { lines: 85, functions: 85, branches: 70, statements: 85 },
      },
    },
  },
});
