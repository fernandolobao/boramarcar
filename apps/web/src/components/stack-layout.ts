/**
 * Cálculo da pilha de cartas (`StackSections`), separado do DOM para ser testado.
 *
 * Cada seção que cabe na tela gruda em `top` (base + posição na pilha × faixa). Seção mais alta
 * que a tela não gruda ("flow"), forma um grupo sozinha e começa uma pilha nova depois dela.
 */
export interface StackMetrics {
  /** Distância do topo da tela até a primeira faixa (px). */
  base: number;
  /** Altura da faixa à mostra de cada seção de trás (px). */
  step: number;
  /** Quantas faixas no máximo; as seções além disso grudam na última posição. */
  cap: number;
  /** Altura da janela (px). */
  viewport: number;
}

export interface StackPlanItem {
  sticky: boolean;
  /** Grupo (pilha) a que a seção pertence. */
  group: number;
  /** Posição dentro do grupo. */
  index: number;
  /** Onde a seção gruda (px do topo da tela). */
  top: number;
}

/** Margem embaixo de uma seção grudada, para ela caber inteira na tela. */
const BOTTOM_ROOM = 16;

export function planStack(heights: readonly number[], m: StackMetrics): StackPlanItem[] {
  const plan: StackPlanItem[] = [];
  let group = 0;
  let index = 0;
  heights.forEach((height, i) => {
    const top = m.base + Math.min(index, m.cap) * m.step;
    if (height > m.viewport - top - BOTTOM_ROOM) {
      // Alta demais: rola normal, fica num grupo só dela e a seguinte começa outra pilha.
      if (i > 0 && index > 0) group += 1;
      plan.push({ sticky: false, group, index: 0, top: m.base });
      group += 1;
      index = 0;
      return;
    }
    plan.push({ sticky: true, group, index, top });
    index += 1;
  });
  return plan;
}

export interface StackFrameItem {
  /** Quanto subir a seção (px), empurrada pela pilha seguinte ou por uma seção alta. */
  push: number;
  /** Quanto cortar embaixo (px): a parte coberta pela seção seguinte. */
  clip: number;
  /** 0 = toda à mostra; 1 = reduzida à faixa. */
  cover: number;
  /** Leve recuo da seção de trás. */
  scale: number;
}

/**
 * Posição de cada seção num quadro da rolagem, a partir dos topos "naturais" (sem o empurrão).
 *
 * - Empurrão: quando a primeira seção do grupo seguinte passa do ponto em que grudaria neste
 *   grupo (faixa da última + `step`), o grupo inteiro sobe junto com ela, como no fim de um
 *   contêiner sticky. Grupos anteriores sobem pelo menos o mesmo tanto.
 * - Corte: cada seção é cortada onde começa a seguinte, então os vãos nunca mostram o conteúdo
 *   de seções mais ao fundo.
 */
export function stackFrame(input: {
  plan: readonly StackPlanItem[];
  heights: readonly number[];
  naturalTops: readonly number[];
  step: number;
}): StackFrameItem[] {
  const { plan, heights, naturalTops, step } = input;
  const groups = plan.length ? plan[plan.length - 1]!.group + 1 : 0;
  const lastOf = new Map<number, number>();
  const firstOf = new Map<number, number>();
  plan.forEach((p, i) => {
    lastOf.set(p.group, i);
    if (!firstOf.has(p.group)) firstOf.set(p.group, i);
  });

  // Empurrão de cada grupo, de trás para a frente.
  const groupPush = new Array<number>(groups).fill(0);
  for (let g = groups - 2; g >= 0; g -= 1) {
    const last = lastOf.get(g)!;
    const next = firstOf.get(g + 1)!;
    const own = plan[last]!.sticky ? Math.max(0, plan[last]!.top + step - naturalTops[next]!) : 0;
    groupPush[g] = Math.max(own, groupPush[g + 1]!);
  }

  const push = plan.map((p) => (p.sticky ? groupPush[p.group]! : 0));
  const screenTops = naturalTops.map((top, i) => top - push[i]!);

  return plan.map((_, i) => {
    const height = heights[i]!;
    const nextTop = screenTops[i + 1];
    if (nextTop === undefined || height <= 0)
      return { push: push[i]!, clip: 0, cover: 0, scale: 1 };
    const visible = nextTop - screenTops[i]!;
    const clip = Math.min(height, Math.max(0, height - visible));
    const room = Math.max(1, height - step);
    const cover = Math.min(1, Math.max(0, (height - Math.max(visible, step)) / room));
    return { push: push[i]!, clip, cover, scale: 1 - 0.02 * cover };
  });
}
