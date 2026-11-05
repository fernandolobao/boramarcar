// @ts-check
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

const webFiles = ['apps/web/**/*.{js,mjs,ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/dist/**',
      '**/next-env.d.ts',
      '**/playwright-report/**',
      '**/test-results/**',
      'packages/db/drizzle/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  ...nextVitals.map((config) => ({ ...config, files: webFiles })),
  {
    // Acessibilidade: regras "strict" do jsx-a11y como erro (o plugin já vem do eslint-config-next).
    files: webFiles,
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Rótulos associados por htmlFor/id ou aninhamento contam como válidos.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
    },
  },
  {
    files: webFiles,
    settings: { next: { rootDir: 'apps/web' } },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  prettier,
);
