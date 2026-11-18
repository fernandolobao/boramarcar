import type { Achievement, AchievementId } from '@boramarcar/core';
import { and, eq, like } from 'drizzle-orm';
import type { Database } from '../client';
import { onboardingSteps } from '../schema';
import { getUserAchievements } from './profiles';

/**
 * Janela de conquistas novas (painel e perfil). Guarda quais conquistas a pessoa já viu (em
 * `onboarding_steps`, que já sai na exportação e na exclusão da conta), em vez de um horário:
 * uma partida registrada depois, com data anterior, também aparece.
 */
const BASELINE = 'achievements-baseline';
const seenStep = (id: string) => `achievement:${id}`;

async function seenSteps(db: Database, userId: string) {
  const rows = await db
    .select({ step: onboardingSteps.step })
    .from(onboardingSteps)
    .where(and(eq(onboardingSteps.userId, userId), like(onboardingSteps.step, 'achievement%')));
  return new Set(rows.map((r) => r.step));
}

async function markSeen(db: Database, userId: string, ids: readonly string[], baseline = false) {
  const steps = [...ids.map(seenStep), ...(baseline ? [BASELINE] : [])];
  if (!steps.length) return;
  await db
    .insert(onboardingSteps)
    .values(steps.map((step) => ({ userId, step })))
    .onConflictDoNothing();
}

/**
 * Conquistas desbloqueadas que a pessoa ainda não viu, mais antigas primeiro. No primeiro
 * acesso, o que já estava conquistado conta como visto (nada de enxurrada).
 */
export async function listNewAchievements(
  db: Database,
  input: { userId: string; now?: Date },
): Promise<Achievement[]> {
  const [achievements, seen] = await Promise.all([
    getUserAchievements(db, input.userId, input.now),
    seenSteps(db, input.userId),
  ]);
  const unlocked = achievements.filter((a) => a.unlocked);
  if (!seen.has(BASELINE)) {
    await markSeen(
      db,
      input.userId,
      unlocked.map((a) => a.id),
      true,
    );
    return [];
  }
  return unlocked
    .filter((a) => !seen.has(seenStep(a.id)))
    .sort((a, b) => (a.unlockedAt?.getTime() ?? 0) - (b.unlockedAt?.getTime() ?? 0));
}

/**
 * A pessoa fechou a janela: as conquistas mostradas nela contam como vistas. Só essas — uma que
 * tenha sido ganha enquanto a janela estava aberta ainda aparece depois.
 */
export async function markAchievementsSeen(
  db: Database,
  input: { userId: string; ids: readonly AchievementId[] },
) {
  await markSeen(db, input.userId, input.ids, true);
}
