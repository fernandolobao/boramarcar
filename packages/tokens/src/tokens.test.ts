import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  palette,
  paletteRoles,
  renderCss,
  scales,
  themes,
  type ThemeTokens,
} from './index';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('paleta da marca', () => {
  it('é a mesma do palette.json entregue pelo design', () => {
    const source = JSON.parse(read('../palette.json')) as { slug: string; hex: string }[];
    for (const { slug, hex } of source) {
      const name = paletteRoles[slug as keyof typeof paletteRoles];
      expect(name, slug).toBeDefined();
      expect(palette[name]).toBe(hex.toLowerCase());
    }
    expect(source).toHaveLength(Object.keys(palette).length);
  });

  it('as escalas passam pelas cores da paleta e escurecem em ordem', () => {
    expect(scales.brand[600]).toBe(palette.eter);
    expect(scales.brand[900]).toBe(palette.arcano);
    expect(scales.ink[100]).toBe(palette.pergaminho);
    expect(scales.ink[950]).toBe(palette.noite);
    expect(scales.gold[400]).toBe(palette.dourado);
    expect(scales.teal[500]).toBe(palette.mana);
    for (const scale of Object.values(scales)) {
      const values = Object.values(scale);
      for (let i = 1; i < values.length; i++) {
        // Cada passo é mais escuro que o anterior (contraste com o branco cresce).
        expect(contrastRatio(values[i]!, '#ffffff')).toBeGreaterThan(
          contrastRatio(values[i - 1]!, '#ffffff'),
        );
      }
    }
  });
});

describe.each(['light', 'dark'] as const)('tema %s: contraste WCAG 2.2 AA', (name) => {
  const t: ThemeTokens = themes[name];
  const backgrounds = { canvas: t.canvas, surface: t.surface };

  it.each([
    ['fg', 'canvas'],
    ['fg', 'surface'],
    ['fg', 'surfaceMuted'],
    ['fgMuted', 'canvas'],
    ['fgMuted', 'surface'],
    ['fgMuted', 'surfaceMuted'],
    ['link', 'canvas'],
    ['link', 'surface'],
    ['onPrimary', 'primary'],
    ['onPrimary', 'primaryHover'],
    ['onAccent', 'accent'],
    ['accentText', 'canvas'],
    ['accentText', 'surface'],
    ['manaText', 'canvas'],
    ['manaText', 'surface'],
    ['success', 'canvas'],
    ['success', 'surface'],
    ['danger', 'canvas'],
    ['danger', 'surface'],
  ] as const)('texto %s sobre %s ≥ 4,5:1', (fg, bg) => {
    expect(contrastRatio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('bordas de campos e anel de foco ≥ 3:1 sobre o fundo e as superfícies', () => {
    for (const bg of Object.values(backgrounds)) {
      expect(contrastRatio(t.lineStrong, bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.focus, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('CSS do site', () => {
  it('apps/web/src/styles/tokens.css está atualizado (rode build:css)', () => {
    expect(read('../../../apps/web/src/styles/tokens.css')).toBe(renderCss());
  });

  it('expõe paleta, escalas e cores por função, com o tema escuro', () => {
    const css = renderCss();
    expect(css).toContain('--color-arcano: #3b0d6b;');
    expect(css).toContain('--color-ink-600: #575259;');
    expect(css).toContain('--color-fg-muted: var(--ak-fg-muted);');
    expect(css).toMatch(/:root \{\n {2}--ak-canvas: #f4ebdb;/);
    expect(css).toContain('--ak-canvas: #0b0716;');
  });
});
