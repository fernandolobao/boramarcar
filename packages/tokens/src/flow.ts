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
import { scales } from './index';

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

/**
 * Cor das barras de gráfico por cor de mana (curva, nota, chances), com contraste ≥ 3:1 sobre a
 * superfície dos cartões no tema claro e no escuro (WCAG 1.4.11; testado em `flow.test.ts`).
 */
export const MANA_BAR_COLORS: Record<'light' | 'dark', Record<ManaColor, string>> = {
  light: {
    W: '#a07a1c',
    U: '#2563eb',
    B: '#4b3a63',
    R: '#dc2626',
    G: '#15803d',
    C: '#78716c',
  },
  dark: {
    W: '#f0d68a',
    U: '#60a5fa',
    B: '#a294b8',
    R: '#f87171',
    G: '#4ade80',
    C: '#a8a29e',
  },
};

/** Dourado das barras para decks de três cores ou mais (≥ 3:1 com a superfície nos dois temas). */
/**
 * Barras douradas (decks de três cores ou mais): degradê metálico da escala `gold` (claro em cima,
 * mais quente embaixo). No tema claro o dourado puro tem pouco contraste com o fundo (e o tom
 * escuro o bastante parecia marrom), então a barra ganha um contorno de 1 px em `gold-700`, que
 * dá os 3:1 (WCAG 1.4.11). No escuro, o próprio dourado já passa de 3:1.
 */
export const GOLD_BAR: Record<'light' | 'dark', { stops: readonly string[]; edge: string | null }> =
  {
    light: {
      stops: [scales.gold[300], scales.gold[400], scales.gold[500]],
      edge: scales.gold[700],
    },
    dark: { stops: [scales.gold[200], scales.gold[400], scales.gold[500]], edge: null },
  };

const goldFill = (theme: 'light' | 'dark') =>
  `linear-gradient(180deg, ${GOLD_BAR[theme].stops.join(', ')})`;

const manaCount = (identity: readonly string[]) =>
  MANA_COLORS.filter((c) => c !== 'C' && identity.includes(c)).length;

/** Contorno das barras (só nas douradas do tema claro); `transparent` nas outras. */
export function deckBarEdge(identity: readonly string[], theme: 'light' | 'dark'): string {
  return manaCount(identity) >= 3 ? (GOLD_BAR[theme].edge ?? 'transparent') : 'transparent';
}

/**
 * Fundo das barras nas cores de um deck: uma cor, ou um degradê das duas cores (na ordem WUBRG).
 * Com três cores ou mais o degradê vira um arco-íris que atrapalha a leitura, então as barras
 * ficam douradas, a cor de destaque da marca. Sem identidade, incolor.
 */
export function deckBarBackground(identity: readonly string[], theme: 'light' | 'dark'): string {
  const colors = MANA_COLORS.filter((c) => c !== 'C' && identity.includes(c)).map(
    (c) => MANA_BAR_COLORS[theme][c],
  );
  if (colors.length === 0) return MANA_BAR_COLORS[theme].C;
  if (colors.length === 1) return colors[0]!;
  if (colors.length === 2) return `linear-gradient(135deg, ${colors.join(', ')})`;
  return goldFill(theme);
}
