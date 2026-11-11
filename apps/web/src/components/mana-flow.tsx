'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_FLOW, normalizeFlow, sampleFlow, type FlowStop } from '@boramarcar/tokens/flow';

/* ---------- Paleta da página ----------
   O layout desenha o fluxo; a página só diz as cores (`<ManaFlowColors stops={…} />`). */
let pageFlow: FlowStop[] | null = null;
const listeners = new Set<() => void>();
const setPageFlow = (stops: FlowStop[] | null) => {
  pageFlow = stops;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Cores do fluxo de mana nesta página (deck, coleção, perfil). Sem ela, o espectro padrão. */
export function ManaFlowColors({ stops }: { stops: FlowStop[] }) {
  const key = JSON.stringify(stops);
  useEffect(() => {
    setPageFlow(JSON.parse(key) as FlowStop[]);
    return () => setPageFlow(null);
  }, [key]);
  return null;
}

/* ---------- Desenho ---------- */

type Palette = ReturnType<typeof normalizeFlow>;

interface Shape {
  /** Posição do eixo da faixa, em fração da largura, no topo e embaixo. */
  fromX: number;
  toX: number;
  /** Largura da faixa (fração da largura): mínima na "cintura" e máxima nas pontas. */
  minWidth: number;
  maxWidth: number;
  strands: number;
}

const DESKTOP: Shape = { fromX: 0.96, toX: 0.22, minWidth: 0.05, maxWidth: 0.26, strands: 160 };
const MOBILE: Shape = { fromX: 1.02, toX: 0.05, minWidth: 0.08, maxWidth: 0.4, strands: 90 };
const SEGMENTS = 40;
const TAU = Math.PI * 2;

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

/**
 * Uma faixa de fios finos que desce pela lateral num "S", torcendo e dobrando como seda ou mana
 * líquida; a cor de cada fio corre pela paleta ao longo do caminho (iridescência). Por baixo, um
 * brilho desfocado (desenhado em baixa resolução e ampliado) dá o volume.
 */
function draw(
  ctx: CanvasRenderingContext2D,
  haze: CanvasRenderingContext2D,
  w: number,
  h: number,
  seconds: number,
  palette: Palette,
  dark: boolean,
) {
  const shape = w < 640 ? MOBILE : DESKTOP;
  const t = seconds;
  const sway = (s: number) => 0.06 * Math.sin(TAU * (0.55 * s) + t * 0.11) * (0.4 + s);
  const axisX = (s: number) => {
    const eased = s * s * (3 - 2 * s);
    return w * (shape.fromX + (shape.toX - shape.fromX) * eased + sway(s));
  };
  const axisY = (s: number) => h * (-0.06 + 1.12 * s);
  const width = (s: number) =>
    w *
    (shape.minWidth +
      (shape.maxWidth - shape.minWidth) * (0.5 + 0.5 * Math.cos(TAU * (s * 0.95) + t * 0.07)));
  // Torção desigual ao longo da faixa: dobras mais fechadas em alguns trechos (vincos da seda).
  const twist = (s: number) => TAU * 1.15 * s + 0.9 * Math.sin(TAU * 0.5 * s + t * 0.09) + t * 0.2;

  // Eixo e normal em cada segmento (iguais para todos os fios).
  const axis = Array.from({ length: SEGMENTS + 1 }, (_, k) => {
    const s = k / SEGMENTS;
    const x = axisX(s);
    const y = axisY(s);
    const dx = axisX(Math.min(1, s + 0.01)) - axisX(Math.max(0, s - 0.01));
    const dy = axisY(Math.min(1, s + 0.01)) - axisY(Math.max(0, s - 0.01));
    const len = Math.hypot(dx, dy) || 1;
    return { s, x, y, nx: -dy / len, ny: dx / len, width: width(s), twist: twist(s) };
  });

  ctx.clearRect(0, 0, w, h);

  // Brilho de fundo: poucos traços grossos em baixa resolução, ampliados (fica desfocado).
  const hw = haze.canvas.width;
  const hh = haze.canvas.height;
  haze.clearRect(0, 0, hw, hh);
  haze.lineCap = 'round';
  for (let b = 0; b < 5; b += 1) {
    const u = -0.8 + (1.6 * b) / 4;
    const gradient = haze.createLinearGradient(0, 0, 0, hh);
    for (let k = 0; k <= 4; k += 1) {
      gradient.addColorStop(k / 4, rgba(sampleFlow(palette, k / 5 + u * 0.2 + t * 0.012), 1));
    }
    haze.strokeStyle = gradient;
    haze.globalAlpha = dark ? 0.12 : 0.14;
    haze.lineWidth = (w * shape.maxWidth * 0.35 * hw) / w;
    haze.beginPath();
    for (const p of axis) {
      const off = (u * p.width * 0.5 * Math.cos(p.twist)) / 1;
      const x = ((p.x + p.nx * off) * hw) / w;
      const y = ((p.y + p.ny * off) * hh) / h;
      if (p.s === 0) haze.moveTo(x, y);
      else haze.lineTo(x, y);
    }
    haze.stroke();
  }
  ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(haze.canvas, 0, 0, w, h);

  // Fios: cada um a uma distância do eixo; a torção (cos) dobra a faixa e junta os fios.
  ctx.lineWidth = 1.25;
  const n = shape.strands;
  for (let j = 0; j < n; j += 1) {
    const u = -1 + (2 * j) / (n - 1);
    const edge = Math.abs(u);
    const gradient = ctx.createLinearGradient(0, axisY(0), 0, axisY(1));
    for (let k = 0; k <= 5; k += 1) {
      const s = k / 5;
      const tw = twist(s);
      // Cores em faixas ao longo dos fios (como a luz decomposta na seda), mudando devagar.
      const hue = u * 0.5 + s * 0.3 + 0.12 * Math.sin(tw) + t * 0.012;
      // Mais forte nas bordas e onde a faixa vira de frente (a luz "bate" na dobra).
      const light = 0.45 + 0.55 * Math.abs(Math.sin(tw + u * 0.6));
      gradient.addColorStop(s, rgba(sampleFlow(palette, hue), light));
    }
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = (dark ? 0.34 : 0.62) * (0.6 + 0.4 * edge);
    ctx.beginPath();
    for (const p of axis) {
      const wave = 2.5 * Math.sin(p.s * 18 + j * 0.37 + t * 0.6);
      const off = u * p.width * 0.5 * Math.cos(p.twist + u * 0.35) + wave;
      const x = p.x + p.nx * off;
      const y = p.y + p.ny * off;
      if (p.s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

const isDark = () => {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Fluxo de mana: fios iridescentes que correm pela lateral da tela, como mana fluindo. Cores da
 * página (`ManaFlowColors`) ou o espectro padrão. Só decoração (`aria-hidden`), atrás do
 * conteúdo; com "reduzir movimento" fica parado; pausa fora da tela e com a aba escondida.
 */
export function ManaFlow() {
  const ref = useRef<HTMLCanvasElement>(null);
  const stops = useSyncExternalStore(
    subscribe,
    () => pageFlow,
    () => null,
  );
  const paletteRef = useRef<Palette>(normalizeFlow(DEFAULT_FLOW));
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    paletteRef.current = normalizeFlow(stops ?? DEFAULT_FLOW);
    redrawRef.current();
  }, [stops]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const hazeCanvas = document.createElement('canvas');
    const haze = hazeCanvas.getContext('2d');
    if (!canvas || !ctx || !haze) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    // Começa num ponto qualquer do ciclo, para cada página não abrir igual.
    const offset = Math.random() * 600;

    const render = (now: number) => {
      draw(ctx, haze, width, height, offset + now / 1000, paletteRef.current, isDark());
    };
    const loop = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || reduce.matches) return;
      // ~30 quadros por segundo bastam para um movimento tão lento.
      if (now - last >= 33) {
        last = now;
        render(now);
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && visible && !document.hidden && !reduce.matches) {
        frame = requestAnimationFrame(loop);
      }
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      hazeCanvas.width = Math.max(1, Math.round(width / 8));
      hazeCanvas.height = Math.max(1, Math.round(height / 8));
      render(performance.now());
    };
    redrawRef.current = () => render(performance.now());

    resize();
    start();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      start();
    });
    intersection.observe(canvas);
    const onVisibility = () => start();
    const onMotion = () => {
      render(performance.now());
      start();
    };
    const themeObserver = new MutationObserver(() => render(performance.now()));
    themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotion);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotion);
      redrawRef.current = () => {};
    };
  }, []);

  return <canvas ref={ref} className="mana-flow" aria-hidden="true" />;
}
