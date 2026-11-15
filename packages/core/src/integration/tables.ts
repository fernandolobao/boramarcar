/**
 * Sugestão de mesas para o encontro: divide quem confirmou em mesas do tamanho certo, juntando
 * quem menos jogou junto. Pura e determinística: a mesma entrada e semente dão a mesma divisão.
 */

/** Partidas em que `a` e `b` jogaram juntos: nos últimos 90 dias e antes disso. */
export interface PairCount {
  a: string;
  b: string;
  recent: number;
  older: number;
}

export interface TableOptions {
  min?: number;
  max?: number;
  preferred?: number;
}

export interface SuggestedTable {
  playerIds: string[];
  /** Duplas desta mesa que nunca jogaram juntas. */
  newPairs: number;
}

/** A sugestão só aparece a partir de 6 confirmados (duas mesas). */
export const MIN_PLAYERS_FOR_TABLES = 6;
/** Partida recente pesa 3 vezes mais que uma antiga. */
const RECENT_WEIGHT = 3;

/** Tamanhos das mesas: o mais perto possível do preferido, todas entre min e max e quase iguais. */
export function tableSizes(n: number, opts: TableOptions = {}): number[] {
  const { min = 3, max = 5, preferred = 4 } = opts;
  if (n < 2 * min) return [];
  const fits = (k: number) => k >= 2 && n >= k * min && n <= k * max;
  const ideal = Math.max(2, Math.round(n / preferred));
  // Procura o número de mesas válido mais perto do ideal.
  for (let d = 0; d <= n; d++) {
    for (const k of d === 0 ? [ideal] : [ideal + d, ideal - d]) {
      if (fits(k)) {
        const base = Math.floor(n / k);
        const extra = n % k;
        return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
      }
    }
  }
  return [];
}

/** Gerador pseudoaleatório pequeno e determinístico (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function suggestTables(
  playerIds: string[],
  pairs: PairCount[],
  opts: TableOptions & { seed: number },
): { tables: SuggestedTable[]; cost: number } | null {
  const players = [...new Set(playerIds)].sort();
  if (players.length < MIN_PLAYERS_FOR_TABLES) return null;
  const sizes = tableSizes(players.length, opts);
  if (sizes.length === 0) return null;

  const weight = new Map<string, number>();
  const played = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const p of pairs) {
    const k = key(p.a, p.b);
    weight.set(k, (weight.get(k) ?? 0) + RECENT_WEIGHT * p.recent + p.older);
    if (p.recent + p.older > 0) played.add(k);
  }
  const w = (a: string, b: string) => weight.get(key(a, b)) ?? 0;

  // Divisão inicial: embaralha com a semente e distribui pelos tamanhos.
  const next = random(opts.seed);
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const tables: string[][] = [];
  let at = 0;
  for (const size of sizes) {
    tables.push(shuffled.slice(at, at + size));
    at += size;
  }

  // Custo de uma pessoa numa mesa (sem contar ela mesma ou quem vai sair na troca).
  const costWith = (id: string, table: string[], except: string) =>
    table.reduce((sum, other) => (other === id || other === except ? sum : sum + w(id, other)), 0);

  // Trocas entre mesas enquanto alguma reduzir o custo total.
  let improved = true;
  while (improved) {
    improved = false;
    for (let t1 = 0; t1 < tables.length; t1++) {
      for (let t2 = t1 + 1; t2 < tables.length; t2++) {
        const A = tables[t1]!;
        const B = tables[t2]!;
        for (let i = 0; i < A.length; i++) {
          for (let j = 0; j < B.length; j++) {
            const x = A[i]!;
            const y = B[j]!;
            const delta =
              costWith(x, B, y) + costWith(y, A, x) - costWith(x, A, x) - costWith(y, B, y);
            if (delta < 0) {
              A[i] = y;
              B[j] = x;
              improved = true;
            }
          }
        }
      }
    }
  }

  let cost = 0;
  const result = tables.map((table) => {
    let newPairs = 0;
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        cost += w(table[i]!, table[j]!);
        if (!played.has(key(table[i]!, table[j]!))) newPairs++;
      }
    }
    return { playerIds: table, newPairs };
  });
  return { tables: result, cost };
}
