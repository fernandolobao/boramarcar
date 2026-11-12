import { describe, expect, it } from 'vitest';
import { contrastRatio, themes } from './index';
import {
  collectionFlow,
  deckBarBackground,
  MANA_BAR_COLORS,
  DEFAULT_FLOW,
  deckFlow,
  flowFromWeights,
  GOLD_FLOW,
  MANA_TONES,
  normalizeFlow,
  sampleFlow,
} from './flow';

const colorsOf = (stops: { color: string }[]) => stops.map((s) => s.color);
const share = (stops: { color: string; weight: number }[], tones: string[]) =>
  stops.filter((s) => tones.includes(s.color)).reduce((sum, s) => sum + s.weight, 0);

describe('flowFromWeights', () => {
  it('sem peso nenhum, usa o espectro padrão', () => {
    expect(flowFromWeights({})).toBe(DEFAULT_FLOW);
    expect(flowFromWeights({ U: 0, R: -2 })).toBe(DEFAULT_FLOW);
  });

  it('cada cor vira os seus tons, na proporção do peso', () => {
    const stops = flowFromWeights({ U: 3, G: 1 });
    expect(colorsOf(stops)).toEqual([...MANA_TONES.U, ...MANA_TONES.G]);
    expect(share(stops, MANA_TONES.U)).toBeCloseTo(0.75);
    expect(share(stops, MANA_TONES.G)).toBeCloseTo(0.25);
  });

  it('cor muito pequena ainda aparece', () => {
    const stops = flowFromWeights({ R: 1000, W: 1 });
    expect(share(stops, MANA_TONES.W)).toBeCloseTo(0.06);
  });
});

describe('deckFlow', () => {
  it('usa os símbolos de mana das cores da identidade', () => {
    const stops = deckFlow(['G', 'U'], { G: 30, U: 10, R: 5 });
    expect(share(stops, MANA_TONES.G)).toBeCloseTo(0.75);
    expect(share(stops, MANA_TONES.U)).toBeCloseTo(0.25);
    expect(share(stops, MANA_TONES.R)).toBe(0);
  });

  it('sem símbolos, partes iguais; sem identidade, incolor', () => {
    const stops = deckFlow(['W', 'B'], { W: 0, B: 0 });
    expect(share(stops, MANA_TONES.W)).toBeCloseTo(0.5);
    expect(colorsOf(deckFlow([], null))).toEqual(MANA_TONES.C);
    expect(colorsOf(deckFlow(['X'], undefined))).toEqual(MANA_TONES.C);
  });
});

describe('collectionFlow', () => {
  it('soma cópias, divide multicoloridas e conta incolores', () => {
    const stops = collectionFlow([
      { colors: ['R'], quantity: 2 },
      { colors: ['R', 'G'], quantity: 2 },
      { colors: [], quantity: 1 },
      { colors: null, quantity: 1 },
    ]);
    // R = 2 + 1, G = 1, C = 2 → 3/6, 1/6, 2/6
    expect(share(stops, MANA_TONES.R)).toBeCloseTo(0.5);
    expect(share(stops, MANA_TONES.G)).toBeCloseTo(1 / 6);
    expect(share(stops, MANA_TONES.C)).toBeCloseTo(1 / 3);
  });

  it('coleção vazia usa o padrão', () => {
    expect(collectionFlow([])).toBe(DEFAULT_FLOW);
  });
});

describe('normalizeFlow e sampleFlow', () => {
  it('posições começam em 0 e seguem o peso', () => {
    const n = normalizeFlow([
      { color: '#000000', weight: 1 },
      { color: '#ffffff', weight: 3 },
    ]);
    expect(n).toEqual([
      { color: '#000000', at: 0 },
      { color: '#ffffff', at: 0.25 },
    ]);
  });

  it('cores inválidas são ignoradas; nada válido = padrão', () => {
    expect(normalizeFlow([{ color: 'red', weight: 1 }])).toHaveLength(DEFAULT_FLOW.length);
  });

  it('interpola dentro do trecho e é cíclica', () => {
    const n = normalizeFlow([
      { color: '#000000', weight: 1 },
      { color: '#ffffff', weight: 1 },
    ]);
    expect(sampleFlow(n, 0)).toEqual([0, 0, 0]);
    expect(sampleFlow(n, 0.25)).toEqual([128, 128, 128]);
    expect(sampleFlow(n, 0.5)).toEqual([255, 255, 255]);
    // de 0,5 a 1 volta do branco para o preto
    expect(sampleFlow(n, 0.75)).toEqual([128, 128, 128]);
    expect(sampleFlow(n, 1)).toEqual([0, 0, 0]);
    expect(sampleFlow(n, -0.25)).toEqual([128, 128, 128]);
  });

  it('a paleta dourada só tem tons quentes', () => {
    for (const { color } of GOLD_FLOW) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
      expect(r).toBeGreaterThanOrEqual(g!);
      expect(g).toBeGreaterThanOrEqual(b!);
    }
  });
});

describe('barras nas cores do deck', () => {
  it('cada cor tem contraste ≥ 3:1 com a superfície nos dois temas', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const color of Object.values(MANA_BAR_COLORS[theme])) {
        expect(contrastRatio(color, themes[theme].surface)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('uma cor, degradê na ordem WUBRG ou incolor', () => {
    expect(deckBarBackground(['G'], 'light')).toBe(MANA_BAR_COLORS.light.G);
    expect(deckBarBackground(['G', 'U'], 'dark')).toBe(
      `linear-gradient(135deg, ${MANA_BAR_COLORS.dark.U}, ${MANA_BAR_COLORS.dark.G})`,
    );
    expect(deckBarBackground([], 'light')).toBe(MANA_BAR_COLORS.light.C);
  });
});
