/**
 * Erro do Postgres por chave única (23505): um pedido repetido (clique duplo, duas abas) que passou
 * da conferência e bateu no índice. O Drizzle embrulha o erro do driver em `cause`.
 */
export function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    if (typeof e === 'object' && (e as { code?: unknown }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}
