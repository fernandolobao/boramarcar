import type { AchievementId as AppAchievementId } from '@boramarcar/api-client';
import type { AchievementId as ServerAchievementId } from '@boramarcar/core/achievements';

/** Verdadeiro só se os dois tipos têm exatamente os mesmos valores. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Contrato com o servidor, conferido no typecheck do app: a lista de conquistas do cliente da API
 * precisa ser a mesma do núcleo. Conquista nova no servidor que falte aqui não quebra o perfil
 * (o cliente ignora o que não conhece), mas some do app sem aviso; este tipo faz o typecheck
 * falhar antes.
 */
export const achievementIdsMatch: Same<AppAchievementId, ServerAchievementId> = true;
