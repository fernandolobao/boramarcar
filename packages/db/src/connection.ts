/**
 * O `pg` 8.x avisa que `sslmode=require|prefer|verify-ca` hoje equivalem a `verify-full`
 * e que isso vai mudar. Tornamos explícito o comportamento atual (verificação completa
 * do certificado), que é o correto para o Neon e elimina o aviso nos logs.
 */
export function normalizeConnectionString(url: string): string {
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, '$1verify-full');
}

/**
 * URL para migrations: na Vercel com a integração do Neon, `DATABASE_URL_UNPOOLED`
 * aponta para a conexão direta (recomendada para DDL); senão usa `DATABASE_URL`.
 */
export function migrationDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  return url ? normalizeConnectionString(url) : undefined;
}
