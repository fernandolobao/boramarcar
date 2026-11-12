/** Beta assistido (8.5): oito semanas a partir de uma data única escolhida por quem administra. */
export const BETA_WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type BetaPhase = 'draft' | 'scheduled' | 'running' | 'ended';

export interface BetaState {
  phase: BetaPhase;
  startsAt: Date | null;
  /** Fim previsto (início + 8 semanas) ou a data em que foi encerrado antes. */
  endsAt: Date | null;
  /** Semana atual (1 a 8) enquanto o beta está rodando. */
  week: number | null;
}

/**
 * Em que fase o beta está: sem data (`draft`), marcado para depois (`scheduled`), rodando ou
 * encerrado (passaram as 8 semanas ou alguém encerrou antes).
 */
export function betaState(
  input: { startsAt: Date | null; endedAt: Date | null },
  now: Date,
): BetaState {
  const { startsAt, endedAt } = input;
  if (!startsAt) return { phase: 'draft', startsAt: null, endsAt: null, week: null };
  const planned = new Date(startsAt.getTime() + BETA_WEEKS * WEEK_MS);
  const endsAt = endedAt && endedAt < planned ? endedAt : planned;
  if (now < startsAt) return { phase: 'scheduled', startsAt, endsAt, week: null };
  if (now >= endsAt) return { phase: 'ended', startsAt, endsAt, week: null };
  const week = Math.min(BETA_WEEKS, Math.floor((now.getTime() - startsAt.getTime()) / WEEK_MS) + 1);
  return { phase: 'running', startsAt, endsAt, week };
}
