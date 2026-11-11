import { describe, expect, it } from 'vitest';
import { planStack, stackFrame, type StackMetrics } from './stack-layout';

const m: StackMetrics = { base: 16, step: 56, cap: 5, viewport: 800 };

describe('planStack', () => {
  it('seções que cabem na tela grudam em degraus', () => {
    expect(planStack([300, 200, 400], m)).toEqual([
      { sticky: true, group: 0, index: 0, top: 16 },
      { sticky: true, group: 0, index: 1, top: 72 },
      { sticky: true, group: 0, index: 2, top: 128 },
    ]);
  });

  it('seção mais alta que a tela rola e separa as pilhas', () => {
    const plan = planStack([300, 1200, 200, 300], m);
    expect(plan.map((p) => [p.sticky, p.group, p.index])).toEqual([
      [true, 0, 0],
      [false, 1, 0],
      [true, 2, 0],
      [true, 2, 1],
    ]);
  });

  it('a altura que cabe depende do degrau (a 5ª seção tem menos espaço)', () => {
    const plan = planStack([100, 100, 100, 100, 600], m);
    // degrau 4: top = 16 + 4 × 56 = 240; cabe até 800 − 240 − 16 = 544
    expect(plan[4]!.sticky).toBe(false);
  });

  it('o degrau para no limite (cap)', () => {
    const plan = planStack(new Array(8).fill(50), { ...m, cap: 2 });
    expect(plan.map((p) => p.top)).toEqual([16, 72, 128, 128, 128, 128, 128, 128]);
  });
});

describe('stackFrame', () => {
  const plan = planStack([300, 200, 400], m);
  const heights = [300, 200, 400];

  it('sem sobreposição, nada é cortado nem empurrado', () => {
    const frame = stackFrame({ plan, heights, naturalTops: [16, 340, 564], step: 56 });
    expect(frame.map((f) => [f.push, f.clip, f.cover])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it('corta a seção de trás onde começa a da frente e esmaece ao ficar só a faixa', () => {
    // a 2ª já grudou (72): da 1ª sobram 56 px, a faixa
    const frame = stackFrame({ plan, heights, naturalTops: [16, 72, 200], step: 56 });
    expect(frame[0]).toMatchObject({ push: 0, clip: 244, cover: 1 });
    expect(frame[0]!.scale).toBeCloseTo(0.98);
    // a 3ª ainda vem vindo: a 2ª está coberta em parte (128 px à mostra)
    expect(frame[1]).toMatchObject({ clip: 72 });
    expect(frame[1]!.cover).toBeGreaterThan(0);
    expect(frame[1]!.cover).toBeLessThan(1);
  });

  it('no fim da pilha o grupo inteiro sobe junto com a seção que o contêiner soltou', () => {
    // a última (top 128) foi solta 100 px pelo fim do contêiner
    const frame = stackFrame({ plan, heights, naturalTops: [16, 72, 28], step: 56 });
    expect(frame.map((f) => f.push)).toEqual([100, 100, 0]);
  });

  it('seção alta empurra a pilha anterior quando passa do degrau seguinte', () => {
    const tall = planStack([300, 200, 1200], m);
    // degrau seguinte ao da 2ª: 72 + 56 = 128; a alta está em 100 → 28 px de empurrão
    const frame = stackFrame({
      plan: tall,
      heights: [300, 200, 1200],
      naturalTops: [16, 72, 100],
      step: 56,
    });
    expect(frame.map((f) => f.push)).toEqual([28, 28, 0]);
    // a da frente (alta) não é cortada; a 2ª fica com a faixa
    expect(frame[1]!.clip).toBe(200 - 56);
  });

  it('seção seguinte acima da de trás (ex.: alta rolando) esconde a de trás inteira', () => {
    const flow = planStack([1200, 300], m);
    const frame = stackFrame({
      plan: flow,
      heights: [1200, 300],
      naturalTops: [-900, 16],
      step: 56,
    });
    expect(frame[0]!.clip).toBe(1200 - 916);
    const above = stackFrame({
      plan: flow,
      heights: [1200, 300],
      naturalTops: [100, 50],
      step: 56,
    });
    expect(above[0]!.clip).toBe(1200);
  });
});
