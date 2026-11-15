/**
 * "Quem anda sumido" (só dono e admins): presença de cada membro nos últimos encontros realizados
 * e quem não aparece há um tempo, para chamar para o próximo.
 */

export interface AttendanceRow {
  userId: string;
  name: string;
  /** Encontros da janela em que confirmou presença. */
  attended: number;
  /** Encontros da janela que aconteceram depois de a pessoa entrar no grupo. */
  of: number;
  lastGameAt: Date | null;
  /** Desde quando está sumida (última partida, última presença ou entrada); `null` = não está. */
  awaySince: Date | null;
}

/** Janela de frequência: os últimos 8 encontros realizados. */
export const ATTENDANCE_WINDOW = 8;
/** Sumido: não confirmou nenhum dos 4 mais recentes... */
export const AWAY_RECENT_EVENTS = 4;
/** ...e não joga (nem entrou no grupo) há 30 dias. */
export const AWAY_DAYS = 30;
const DAY = 24 * 3600_000;

export function attendanceSummary(input: {
  members: { userId: string; name: string; joinedAt: Date }[];
  /** Encontros realizados, o mais recente primeiro (usa os 8 primeiros). */
  events: { startsAt: Date; confirmed: string[] }[];
  lastGame: Record<string, Date | null | undefined>;
  now: Date;
}): AttendanceRow[] {
  const window = input.events.slice(0, ATTENDANCE_WINDOW);
  const recent = window.slice(0, AWAY_RECENT_EVENTS);
  const cutoff = input.now.getTime() - AWAY_DAYS * DAY;

  const rows = input.members.map((m) => {
    const eligible = window.filter((e) => e.startsAt >= m.joinedAt);
    const attendedEvents = eligible.filter((e) => e.confirmed.includes(m.userId));
    const lastGameAt = input.lastGame[m.userId] ?? null;
    const missedRecent = recent.length > 0 && !recent.some((e) => e.confirmed.includes(m.userId));
    const away =
      m.joinedAt.getTime() <= cutoff &&
      missedRecent &&
      (lastGameAt === null || lastGameAt.getTime() <= cutoff);
    const lastSeen = Math.max(
      m.joinedAt.getTime(),
      lastGameAt?.getTime() ?? 0,
      attendedEvents[0]?.startsAt.getTime() ?? 0,
    );
    return {
      userId: m.userId,
      name: m.name,
      attended: attendedEvents.length,
      of: eligible.length,
      lastGameAt,
      awaySince: away ? new Date(lastSeen) : null,
    };
  });

  const rate = (r: AttendanceRow) => (r.of === 0 ? 1 : r.attended / r.of);
  return rows.sort(
    (a, b) =>
      Number(b.awaySince !== null) - Number(a.awaySince !== null) ||
      (a.awaySince?.getTime() ?? 0) - (b.awaySince?.getTime() ?? 0) ||
      rate(a) - rate(b) ||
      a.name.localeCompare(b.name),
  );
}
