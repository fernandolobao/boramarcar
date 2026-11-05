import { describe, expect, it } from 'vitest';
import { migrationDatabaseUrl, normalizeConnectionString } from './connection';

describe('normalizeConnectionString', () => {
  it.each([
    ['postgres://u:p@h/db?sslmode=require', 'postgres://u:p@h/db?sslmode=verify-full'],
    ['postgres://u:p@h/db?sslmode=prefer&x=1', 'postgres://u:p@h/db?sslmode=verify-full&x=1'],
    ['postgres://u:p@h/db?a=1&sslmode=verify-ca', 'postgres://u:p@h/db?a=1&sslmode=verify-full'],
    ['postgres://u:p@h/db?sslmode=disable', 'postgres://u:p@h/db?sslmode=disable'],
    ['postgres://u:p@localhost/db', 'postgres://u:p@localhost/db'],
  ])('%s', (input, expected) => {
    expect(normalizeConnectionString(input)).toBe(expected);
  });
});

describe('migrationDatabaseUrl', () => {
  it('prefere a URL sem pooler', () => {
    expect(
      migrationDatabaseUrl({
        DATABASE_URL: 'postgres://pooler/db',
        DATABASE_URL_UNPOOLED: 'postgres://direct/db',
      }),
    ).toBe('postgres://direct/db');
    expect(migrationDatabaseUrl({ DATABASE_URL: 'postgres://pooler/db' })).toBe(
      'postgres://pooler/db',
    );
    expect(migrationDatabaseUrl({})).toBeUndefined();
  });
});
