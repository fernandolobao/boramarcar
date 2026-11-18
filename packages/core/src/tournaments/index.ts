import { FORMAT_RULES, isGameFormat } from '../games';
import { DEFAULT_POINTS, type PointsTable } from '../ranking';

/**
 * Torneio suíço do grupo em qualquer formato (9.1; desenho em
 * `docs/superpowers/specs/2026-11-18-torneios-e-lojas-design.md`, correção de 19/11/2026).
 * Tudo aqui é puro: quem é inscrito ("entrant") é um id opaco — uma pessoa ou, no 2HG, uma dupla.
 */

/** Mesa do torneio: pod (todos contra todos) ou par (um contra um, ou dupla contra dupla). */
export type TournamentTable = 'pod' | 'pair';

export interface TournamentShape {
  table: TournamentTable;
  /** Pessoas por inscrição (2 no 2HG: cada inscrição é uma dupla). */
  entrantSize: 1 | 2;
  /** Jogos por rodada, padrão do formato (o organizador pode mudar no um contra um). */
  bestOf: 1 | 3;
}

/** Como o torneio funciona em cada formato, pelas regras que o núcleo já tem. */
export function tournamentShape(format: string): TournamentShape {
  const rules = FORMAT_RULES[isGameFormat(format) ? format : 'other'];
  if (rules.structure === 'free_for_all') return { table: 'pod', entrantSize: 1, bestOf: 1 };
  if (rules.structure === 'teams') return { table: 'pair', entrantSize: 2, bestOf: 3 };
  return { table: 'pair', entrantSize: 1, bestOf: 3 };
}

/**
 * Tamanho de cada pod: o máximo de pods de 4, completando com pods de 3 (4 primeiro). Com 5
 * inscritos, um pod de 5; com 3 ou menos, um pod só.
 */
export function podSizes(count: number): number[] {
  if (count <= 0) return [];
  const pods = Math.ceil(count / 4);
  const threes = pods * 4 - count;
  if (threes > pods) return [count];
  return [...Array<number>(pods - threes).fill(4), ...Array<number>(threes).fill(3)];
}

/**
 * Rodadas recomendadas: no mínimo 3. No par, o suficiente para sobrar um invicto (log₂, como o
 * apêndice E do MTR); no pod, que junta 4 por mesa, log₄ + 1.
 */
export function recommendedRounds(count: number, table: TournamentTable): number {
  if (count <= 1) return 1;
  const rounds =
    table === 'pair' ? Math.ceil(Math.log2(count)) : Math.ceil(Math.log(count) / Math.log(4)) + 1;
  return Math.max(3, rounds);
}

/** Resultado de uma mesa: jogos vencidos por inscrição e jogos empatados (no pod, 1 jogo só). */
export interface TableResult {
  entrants: string[];
  gameWins: Partial<Record<string, number>>;
  gameDraws: number;
}

export interface PlayedRound {
  tables: TableResult[];
}

export type RoundOutcome = 'win' | 'draw' | 'loss' | 'bye';

/**
 * Quem venceu a rodada na mesa: mais jogos vencidos vence; empate no topo (ou ninguém venceu) é
 * empate para quem empatou no topo. Mesa de um só é o bye.
 */
export function tableOutcome(table: TableResult): Record<string, RoundOutcome> {
  const out: Record<string, RoundOutcome> = {};
  if (table.entrants.length === 1) {
    out[table.entrants[0]!] = 'bye';
    return out;
  }
  const wins = (e: string) => table.gameWins[e] ?? 0;
  const best = Math.max(...table.entrants.map(wins));
  const top = table.entrants.filter((e) => wins(e) === best);
  const decided = best > 0 && top.length === 1;
  for (const e of table.entrants) {
    if (!top.includes(e)) out[e] = 'loss';
    else out[e] = decided ? 'win' : 'draw';
  }
  return out;
}

export interface Standing {
  entrant: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  /** % de vitórias dos oponentes (MTR), com piso de 33%. */
  omw: number;
  /** % de jogos vencidos (MTR), com piso de 33%. */
  gw: number;
  /** % de jogos vencidos dos oponentes (MTR). */
  ogw: number;
  /** Posição; quem empata em tudo divide a posição. */
  rank: number;
}

const FLOOR = 0.33;
const EPSILON = 1e-9;

/**
 * Classificação: pontos (tabela do torneio; bye vale vitória), depois OMW%, GW% e OGW% do MTR (na
 * escala 3/1/0 do MTR, qualquer que seja a pontuação). O bye conta como vitória por 2 a 0 para a
 * própria pessoa e fica fora das contas dos oponentes.
 */
export function standings(
  entrants: readonly string[],
  rounds: readonly PlayedRound[],
  points: PointsTable = DEFAULT_POINTS,
): Standing[] {
  type Acc = {
    wins: number;
    draws: number;
    losses: number;
    byes: number;
    gamePoints: number;
    games: number;
    opponents: string[];
  };
  const acc = new Map<string, Acc>(
    entrants.map((e) => [
      e,
      { wins: 0, draws: 0, losses: 0, byes: 0, gamePoints: 0, games: 0, opponents: [] },
    ]),
  );
  for (const round of rounds) {
    for (const table of round.tables) {
      const outcome = tableOutcome(table);
      const totalGames =
        table.entrants.reduce((sum, e) => sum + (table.gameWins[e] ?? 0), 0) + table.gameDraws;
      for (const e of table.entrants) {
        const a = acc.get(e);
        if (!a) continue;
        const result = outcome[e]!;
        if (result === 'bye') {
          a.byes += 1;
          a.gamePoints += 6;
          a.games += 2;
          continue;
        }
        if (result === 'win') a.wins += 1;
        else if (result === 'draw') a.draws += 1;
        else a.losses += 1;
        a.gamePoints += 3 * (table.gameWins[e] ?? 0) + table.gameDraws;
        a.games += totalGames;
        a.opponents.push(...table.entrants.filter((o) => o !== e));
      }
    }
  }
  const mwp = (a: Acc) => {
    const matches = a.wins + a.draws + a.losses + a.byes;
    return matches === 0
      ? FLOOR
      : Math.max(FLOOR, (3 * (a.wins + a.byes) + a.draws) / (3 * matches));
  };
  const gwp = (a: Acc) => (a.games === 0 ? FLOOR : Math.max(FLOOR, a.gamePoints / (3 * a.games)));
  const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;

  const rows = entrants.map((e, seed) => {
    const a = acc.get(e)!;
    const opponents = a.opponents.map((o) => acc.get(o)).filter((o): o is Acc => Boolean(o));
    return {
      seed,
      entrant: e,
      points: (a.wins + a.byes) * points.win + a.draws * points.draw + a.losses * points.loss,
      wins: a.wins,
      draws: a.draws,
      losses: a.losses,
      byes: a.byes,
      omw: average(opponents.map(mwp)),
      gw: gwp(a),
      ogw: average(opponents.map(gwp)),
    };
  });
  const keys = ['points', 'omw', 'gw', 'ogw'] as const;
  const compare = (x: (typeof rows)[number], y: (typeof rows)[number]) => {
    for (const k of keys) if (Math.abs(x[k] - y[k]) > EPSILON) return y[k] - x[k];
    return 0;
  };
  rows.sort((x, y) => compare(x, y) || x.seed - y.seed);
  let rank = 0;
  return rows.map(({ seed: _seed, ...row }, i) => {
    if (i === 0 || compare(rows[i - 1]!, rows[i]!) !== 0) rank = i + 1;
    return { ...row, rank };
  });
}

/** Quantas vezes cada par de inscrições já dividiu mesa (o bye não conta). */
function meetings(rounds: readonly PlayedRound[]) {
  const met = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const round of rounds)
    for (const t of round.tables)
      for (let i = 0; i < t.entrants.length; i++)
        for (let j = i + 1; j < t.entrants.length; j++) {
          const k = key(t.entrants[i]!, t.entrants[j]!);
          met.set(k, (met.get(k) ?? 0) + 1);
        }
  return (a: string, b: string) => met.get(key(a, b)) ?? 0;
}

/**
 * Mesas da próxima rodada. 1ª rodada: sorteio. Depois: pela classificação, juntando quem está
 * perto e evitando quem já dividiu mesa. No par, número ímpar dá um bye para quem tem menos pontos
 * e ainda não teve bye. Devolve as mesas (ids), na ordem das mesas.
 */
export function pairRound(
  entrants: readonly string[],
  rounds: readonly PlayedRound[],
  options: { table: TournamentTable; random?: () => number },
): string[][] {
  const random = options.random ?? Math.random;
  let order: string[];
  if (rounds.length === 0) {
    order = [...entrants];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
  } else {
    order = standings(entrants, rounds).map((s) => s.entrant);
  }
  const met = meetings(rounds);
  const tables: string[][] = [];

  if (options.table === 'pair') {
    let bye: string | null = null;
    if (order.length % 2 === 1) {
      const hadBye = new Set(
        rounds.flatMap((r) =>
          r.tables.filter((t) => t.entrants.length === 1).map((t) => t.entrants[0]!),
        ),
      );
      bye = [...order].reverse().find((e) => !hadBye.has(e)) ?? order[order.length - 1]!;
      order = order.filter((e) => e !== bye);
    }
    while (order.length > 0) {
      const first = order.shift()!;
      const index = order.findIndex((o) => met(first, o) === 0);
      const [second] = order.splice(index >= 0 ? index : 0, 1);
      tables.push([first, second!]);
    }
    if (bye) tables.push([bye]);
    return tables;
  }

  const remaining = [...order];
  for (const size of podSizes(remaining.length)) {
    const pod = [remaining.shift()!];
    while (pod.length < size) {
      let best = 0;
      let bestScore = Infinity;
      remaining.forEach((candidate, i) => {
        // Repetir adversário pesa mais que a distância na classificação.
        const score = pod.reduce((s, p) => s + met(p, candidate), 0) * 1000 + i;
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      });
      pod.push(remaining.splice(best, 1)[0]!);
    }
    tables.push(pod);
  }
  return tables;
}
