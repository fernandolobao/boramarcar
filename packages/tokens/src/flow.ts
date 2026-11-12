/**
 * Paletas do "fluxo de mana": a faixa de fios iridescentes que corre pela lateral das telas do
 * app (componente `ManaFlow` no site, `Aura` no app). Funções puras, testadas em `flow.test.ts`.
 *
 * - Padrão: o espectro holográfico da referência (vermelho → laranja → amarelo → menta → ciano →
 *   azul → índigo → violeta → rosa).
 * - Deck: as cores da identidade do deck, no peso dos símbolos de mana.
 * - Coleção: a proporção das cores das cartas da coleção.
 * - Perfil: ouro líquido, em vários tons.
 */
export interface FlowStop {
  color: string;
  /** Parte da faixa ocupada pela cor (relativo; normalizado em `normalizeFlow`). */
  weight: number;
}

/** Espectro holográfico (cores tiradas da referência). */
export const DEFAULT_FLOW: FlowStop[] = [
  '#e04a44',
  '#de7937',
  '#f3a434',
  '#f8d55a',
  '#65f1c2',
  '#38dfee',
  '#42a0ff',
  '#3d5fdd',
  '#9259e5',
  '#e066bb',
].map((color) => ({ color, weight: 1 }));

/** Ouro líquido: do âmbar escuro ao brilho quase branco, com o dourado da marca no meio. */
export const GOLD_FLOW: FlowStop[] = [
  { color: '#6b3f06', weight: 0.8 },
  { color: '#a8700f', weight: 1 },
  { color: '#d99a1e', weight: 1.2 },
  { color: '#f6b944', weight: 1.4 },
  { color: '#ffd978', weight: 1.1 },
  { color: '#fff3c9', weight: 0.6 },
  { color: '#e8a92c', weight: 1 },
  { color: '#8a5609', weight: 0.8 },
];

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
export const MANA_COLORS: readonly ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

/**
 * Tons de cada cor de mana (escuro → claro → médio): cada cor vira um pequeno degradê, para a
 * faixa ter profundidade mesmo num deck de uma cor só. Branco puxa para o marfim dourado e preto
 * para o violeta-noite, para aparecerem no fundo claro e no escuro.
 */
export const MANA_TONES: Record<ManaColor, string[]> = {
  W: ['#c9a24a', '#f8e7b9', '#fff8e1', '#e9cf8a'],
  U: ['#1d4ed8', '#3b82f6', '#93c5fd', '#2563eb'],
  B: ['#2a1d3d', '#5b4777', '#a294b8', '#3b2c52'],
  R: ['#b91c1c', '#ef4444', '#fca5a5', '#dc2626'],
  G: ['#15803d', '#22c55e', '#86efac', '#16a34a'],
  C: ['#78716c', '#a8a29e', '#e7e5e4', '#8f8984'],
};

const isManaColor = (value: string): value is ManaColor =>
  (MANA_COLORS as readonly string[]).includes(value);

/** Faixa a partir do peso de cada cor (cores sem peso ficam de fora; nada = padrão). */
export function flowFromWeights(weights: Partial<Record<string, number>>): FlowStop[] {
  const entries = MANA_COLORS.map((c) => [c, Math.max(0, weights[c] ?? 0)] as const).filter(
    ([, w]) => w > 0,
  );
  if (entries.length === 0) return DEFAULT_FLOW;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  return entries.flatMap(([color, w]) => {
    // Cor muito pequena ainda aparece (no mínimo 6% da faixa).
    const share = Math.max(w / total, 0.06);
    const tones = MANA_TONES[color];
    return tones.map((tone) => ({ color: tone, weight: share / tones.length }));
  });
}

/**
 * Faixa de um deck: as cores da identidade, no peso dos símbolos de mana delas. Sem símbolos
 * (ex.: só terrenos), as cores da identidade em partes iguais; sem identidade, incolor.
 */
export function deckFlow(
  identity: readonly string[],
  pips?: Partial<Record<string, number>> | null,
): FlowStop[] {
  const colors = identity.filter(isManaColor).filter((c) => c !== 'C');
  if (colors.length === 0) return flowFromWeights({ C: 1 });
  const weights: Partial<Record<ManaColor, number>> = {};
  const withPips = colors.some((c) => (pips?.[c] ?? 0) > 0);
  for (const c of colors) weights[c] = withPips ? (pips?.[c] ?? 0) : 1;
  return flowFromWeights(weights);
}

/**
 * Faixa de uma coleção: cada cópia soma 1 dividido entre as cores da carta (identidade de cor) (multicolorida vale
 * uma fração para cada cor); carta sem cor conta como incolor.
 */
export function collectionFlow(
  cards: readonly { colors?: readonly string[] | null; quantity: number }[],
): FlowStop[] {
  const weights: Partial<Record<ManaColor, number>> = {};
  for (const card of cards) {
    const colors = (card.colors ?? []).filter(isManaColor);
    const list: ManaColor[] = colors.length ? colors : ['C'];
    for (const c of list) weights[c] = (weights[c] ?? 0) + card.quantity / list.length;
  }
  return flowFromWeights(weights);
}

/** Pesos somando 1, com as posições de início de cada cor na faixa. */
export function normalizeFlow(stops: readonly FlowStop[]): { color: string; at: number }[] {
  const valid = stops.filter((s) => s.weight > 0 && /^#[0-9a-f]{6}$/i.test(s.color));
  const list = valid.length ? valid : DEFAULT_FLOW;
  const total = list.reduce((sum, s) => sum + s.weight, 0);
  let at = 0;
  return list.map((s) => {
    const stop = { color: s.color, at };
    at += s.weight / total;
    return stop;
  });
}

const hex = (color: string) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

/**
 * Cor da faixa na posição `t` (cíclica: 1 volta ao começo), misturando a cor do trecho com a
 * seguinte para os degradês não terem degraus. Devolve `[r, g, b]`.
 */
export function sampleFlow(
  normalized: readonly { color: string; at: number }[],
  t: number,
): [number, number, number] {
  const x = ((t % 1) + 1) % 1;
  let i = normalized.length - 1;
  while (i > 0 && normalized[i]!.at > x) i -= 1;
  const current = normalized[i]!;
  const next = normalized[(i + 1) % normalized.length]!;
  const end = i + 1 < normalized.length ? next.at : 1;
  const span = Math.max(1e-6, end - current.at);
  const k = Math.min(1, Math.max(0, (x - current.at) / span));
  const a = hex(current.color);
  const b = hex(next.color);
  return [0, 1, 2].map((j) => Math.round(a[j]! + (b[j]! - a[j]!) * k)) as [number, number, number];
}
