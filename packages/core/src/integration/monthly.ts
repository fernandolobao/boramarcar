import { zonedLocalToUtc } from '../time';
import { groupRecords, type GroupRecords, type RecordDecks, type RecordGame } from './records';

/**
 * Retrospectiva do mês do grupo (8.12): calculada das partidas, sem dado novo. O período é
 * `[from, to)` (início do mês e início do mês seguinte, no fuso do grupo).
 */
export interface MonthlyRecap {
  games: number;
  /** Encontros com ao menos uma partida no mês. */
  nights: number;
  players: string[];
  /** Mais vitórias no mês; empate: menos partidas (melhor aproveitamento), depois quem venceu antes. */
  winner: { userId: string; wins: number; games: number } | null;
  /** Quem jogou a primeira partida com o grupo neste mês. */
  debuts: string[];
  /** Recordes que já existiam e foram superados no mês. */
  recordsBroken: (keyof Pick<
    GroupRecords,
    'fastestWin' | 'longestGame' | 'longestStreak' | 'busiestNight'
  >)[];
  /** A dupla que mais se enfrentou no mês, com as vitórias de cada um. */
  duel: { a: string; b: string; games: number; aWins: number; bWins: number } | null;
  records: GroupRecords;
}

const inRange = (d: Date, from: Date, to: Date) => d >= from && d < to;

export function monthlyRecap(
  allGames: readonly RecordGame[],
  period: { from: Date; to: Date },
  decks: RecordDecks,
): MonthlyRecap {
  const { from, to } = period;
  const ordered = [...allGames].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  const month = ordered.filter((g) => inRange(g.playedAt, from, to));

  const players = new Set<string>();
  const stats = new Map<string, { wins: number; games: number; firstWin: number }>();
  month.forEach((g, i) => {
    for (const p of g.players) {
      players.add(p.userId);
      const s = stats.get(p.userId) ?? { wins: 0, games: 0, firstWin: Infinity };
      s.games += 1;
      if (p.result === 'win') {
        s.wins += 1;
        s.firstWin = Math.min(s.firstWin, i);
      }
      stats.set(p.userId, s);
    }
  });
  let winner: MonthlyRecap['winner'] = null;
  let best: { wins: number; games: number; firstWin: number } | null = null;
  for (const [userId, s] of stats) {
    if (s.wins === 0) continue;
    const better =
      !best ||
      s.wins > best.wins ||
      (s.wins === best.wins &&
        (s.games < best.games || (s.games === best.games && s.firstWin < best.firstWin)));
    if (better) {
      best = s;
      winner = { userId, wins: s.wins, games: s.games };
    }
  }

  const before = new Set(
    ordered.filter((g) => g.playedAt < from).flatMap((g) => g.players.map((p) => p.userId)),
  );
  const debuts = [...players].filter((id) => !before.has(id));

  // Recordes: os de antes do mês contra os de até o fim do mês.
  const prev = groupRecords(
    ordered.filter((g) => g.playedAt < from),
    decks,
  );
  const now = groupRecords(
    ordered.filter((g) => g.playedAt < to),
    decks,
  );
  const recordsBroken: MonthlyRecap['recordsBroken'] = [];
  if (prev.fastestWin && now.fastestWin && now.fastestWin.turn < prev.fastestWin.turn)
    recordsBroken.push('fastestWin');
  if (prev.longestGame && now.longestGame && now.longestGame.minutes > prev.longestGame.minutes)
    recordsBroken.push('longestGame');
  if (
    prev.longestStreak &&
    now.longestStreak &&
    now.longestStreak.length > prev.longestStreak.length
  )
    recordsBroken.push('longestStreak');
  if (prev.busiestNight && now.busiestNight && now.busiestNight.games > prev.busiestNight.games)
    recordsBroken.push('busiestNight');

  // Duelo do mês: a dupla que mais dividiu mesa (empate: mais vitórias somadas entre os dois).
  const pairs = new Map<
    string,
    { a: string; b: string; games: number; aWins: number; bWins: number }
  >();
  for (const g of month) {
    const ids = [...new Set(g.players.map((p) => p.userId))].sort();
    const won = new Set(g.players.filter((p) => p.result === 'win').map((p) => p.userId));
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i]!, ids[j]!];
        const key = `${a}|${b}`;
        const d = pairs.get(key) ?? { a, b, games: 0, aWins: 0, bWins: 0 };
        d.games += 1;
        if (won.has(a)) d.aWins += 1;
        if (won.has(b)) d.bWins += 1;
        pairs.set(key, d);
      }
  }
  let duel: MonthlyRecap['duel'] = null;
  for (const d of pairs.values()) {
    if (d.games < 2) continue;
    if (
      !duel ||
      d.games > duel.games ||
      (d.games === duel.games && d.aWins + d.bWins > duel.aWins + duel.bWins)
    )
      duel = d;
  }

  return {
    games: month.length,
    nights: new Set(month.map((g) => g.eventId)).size,
    players: [...players],
    winner,
    debuts,
    recordsBroken,
    duel,
    records: groupRecords(month, decks),
  };
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Início e fim (exclusivo) de um mês "AAAA-MM" no fuso dado; `null` se o texto não é um mês. */
export function monthBounds(month: string, timeZone: string): { from: Date; to: Date } | null {
  const m = MONTH_RE.exec(month);
  if (!m) return null;
  const [y, mo] = [Number(m[1]), Number(m[2])];
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  return {
    from: zonedLocalToUtc(`${month}-01T00:00`, timeZone),
    to: zonedLocalToUtc(`${next}-01T00:00`, timeZone),
  };
}

/** O mês ("AAAA-MM") anterior ao de `now`, no fuso dado. */
export function previousMonth(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const [y, mo] = [Number(parts.year), Number(parts.month)];
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
}
