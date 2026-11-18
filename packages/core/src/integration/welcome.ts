/** Quantos dias alguém conta como "novo no grupo" (boas-vindas no painel). */
export const NEW_MEMBER_DAYS = 30;

/** Entrou no grupo há menos de 30 dias? */
export function isNewMember(joinedAt: Date | null | undefined, now: Date): boolean {
  if (!joinedAt) return false;
  return now.getTime() - joinedAt.getTime() < NEW_MEMBER_DAYS * 86_400_000;
}
