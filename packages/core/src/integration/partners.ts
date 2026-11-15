/**
 * "Com quem você ainda não jogou": até 3 membros do grupo com quem a pessoa nunca jogou, ou não
 * joga há mais tempo (mínimo 30 dias), priorizando quem confirmou o próximo encontro.
 */

export interface PartnerHint {
  userId: string;
  name: string;
  /** Última partida juntos; `null` = nunca jogaram. */
  lastPlayedAt: Date | null;
}

/** Só sugere quem não joga com você há pelo menos 30 dias. */
export const PARTNER_MIN_DAYS = 30;
const MAX_HINTS = 3;
const DAY = 24 * 3600_000;

export function partnerHints(input: {
  viewerId: string;
  members: { userId: string; name: string }[];
  lastPlayed: Record<string, Date | null | undefined>;
  confirmedNext: string[];
  now: Date;
}): PartnerHint[] {
  const cutoff = input.now.getTime() - PARTNER_MIN_DAYS * DAY;
  const confirmed = new Set(input.confirmedNext);
  return input.members
    .filter((m) => m.userId !== input.viewerId)
    .map((m) => ({ ...m, lastPlayedAt: input.lastPlayed[m.userId] ?? null }))
    .filter((m) => m.lastPlayedAt === null || m.lastPlayedAt.getTime() <= cutoff)
    .sort(
      (a, b) =>
        Number(confirmed.has(b.userId)) - Number(confirmed.has(a.userId)) ||
        Number(a.lastPlayedAt !== null) - Number(b.lastPlayedAt !== null) ||
        (a.lastPlayedAt?.getTime() ?? 0) - (b.lastPlayedAt?.getTime() ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, MAX_HINTS)
    .map(({ userId, name, lastPlayedAt }) => ({ userId, name, lastPlayedAt }));
}
