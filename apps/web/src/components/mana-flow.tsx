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
  /** Centro e amplitude do vaivém do eixo (fração da largura): começa à direita. */
  center: number;
  amplitude: number;
  /** Largura da faixa (fração da largura): mínima na "cintura" e máxima nas aberturas. */
  minWidth: number;
  maxWidth: number;
  strands: number;
}

const DESKTOP: Shape = {
  center: 0.55,
  amplitude: 0.41,
  minWidth: 0.05,
  maxWidth: 0.26,
  strands: 160,
};
const MOBILE: Shape = { center: 0.55, amplitude: 0.47, minWidth: 0.08, maxWidth: 0.4, strands: 90 };
const SEGMENTS = 48;
const TAU = Math.PI * 2;

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;
const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/**
 * Uma faixa de fios finos que desce a página inteira em curvas (direita → esquerda → direita…),
 * torcendo e dobrando como seda ou mana líquida, e afina até sumir no fim da página. A cor de cada
 * fio corre pela paleta ao longo do caminho (iridescência); por baixo, um brilho desfocado
 * (desenhado em baixa resolução e ampliado) dá o volume.
 *
 * O canvas é do tamanho da janela e fica parado (`position: fixed`): a faixa é definida em
 * coordenadas da página e só o trecho à vista (`scrollY` … `scrollY + h`) é desenhado.
 */
function draw(
  ctx: CanvasRenderingContext2D,
  haze: CanvasRenderingContext2D,
  view: { w: number; h: number; page: number; scrollY: number },
  seconds: number,
  palette: Palette,
  dark: boolean,
) {
  const { w, h, page, scrollY } = view;
  const shape = w < 640 ? MOBILE : DESKTOP;
  const t = seconds;
  // Meia volta (de um lado ao outro) a cada ~1,5 tela, nunca menos de 900 px.
  const period = Math.max(900, h * 1.5);
  const axisX = (y: number) =>
    w *
    (shape.center +
      shape.amplitude * Math.cos((Math.PI * y) / period + 0.18 * Math.sin(t * 0.11 + y / h)));
  const width = (y: number) =>
    w *
    (shape.minWidth +
      (shape.maxWidth - shape.minWidth) *
        (0.5 + 0.5 * Math.cos((TAU * y) / (h * 0.95) + t * 0.07))) *
    // Afina até sumir nos últimos ~60% de tela da página.
    smooth((page - y) / (h * 0.6));
  // Torção desigual ao longo da faixa: dobras mais fechadas em alguns trechos (vincos da seda).
  const twist = (y: number) =>
    (TAU * 1.15 * y) / h + 0.9 * Math.sin((Math.PI * y) / h + t * 0.09) + t * 0.2;

  ctx.clearRect(0, 0, w, h);
  const from = Math.max(-h * 0.06, scrollY - h * 0.25);
  const to = Math.min(page, scrollY + h * 1.25);
  if (to <= from) return;

  // Eixo e normal em cada segmento (iguais para todos os fios), já em coordenadas da tela.
  const axis = Array.from({ length: SEGMENTS + 1 }, (_, k) => {
    const y = from + ((to - from) * k) / SEGMENTS;
    const dx = axisX(y + 4) - axisX(y - 4);
    const len = Math.hypot(dx, 8) || 1;
    return {
      k,
      y,
      x: axisX(y),
      sy: y - scrollY,
      nx: -8 / len,
      ny: dx / len,
      width: width(y),
      twist: twist(y),
    };
  });
  const top = from - scrollY;
  const bottom = to - scrollY;
  const stopsAt = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => from + (to - from) * f);

  // Brilho de fundo: poucos traços grossos em baixa resolução, ampliados (fica desfocado).
  const hw = haze.canvas.width;
  const hh = haze.canvas.height;
  const sx = hw / w;
  const sy = hh / h;
  haze.clearRect(0, 0, hw, hh);
  haze.lineCap = 'round';
  for (let b = 0; b < 5; b += 1) {
    const u = -0.8 + (1.6 * b) / 4;
    const gradient = haze.createLinearGradient(0, top * sy, 0, bottom * sy);
    stopsAt.forEach((y, k) => {
      gradient.addColorStop(
        k / 5,
        rgba(sampleFlow(palette, (y / h) * 0.3 + u * 0.2 + t * 0.012), 1),
      );
    });
    haze.strokeStyle = gradient;
    haze.globalAlpha = dark ? 0.12 : 0.14;
    haze.lineWidth = w * shape.maxWidth * 0.35 * sx;
    haze.beginPath();
    for (const p of axis) {
      const off = u * p.width * 0.5 * Math.cos(p.twist);
      const x = (p.x + p.nx * off) * sx;
      const y = (p.sy + p.ny * off) * sy;
      if (p.k === 0) haze.moveTo(x, y);
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
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    stopsAt.forEach((y, k) => {
      const tw = twist(y);
      // Cores em faixas ao longo dos fios (como a luz decomposta na seda), mudando devagar.
      const hue = u * 0.5 + (y / h) * 0.3 + 0.12 * Math.sin(tw) + t * 0.012;
      // Mais forte nas bordas e onde a faixa vira de frente (a luz "bate" na dobra).
      const light = 0.45 + 0.55 * Math.abs(Math.sin(tw + u * 0.6));
      gradient.addColorStop(k / 5, rgba(sampleFlow(palette, hue), light));
    });
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = (dark ? 0.34 : 0.62) * (0.6 + 0.4 * edge);
    ctx.beginPath();
    for (const p of axis) {
      const wave = 2.5 * Math.sin(p.y / 40 + j * 0.37 + t * 0.6) * Math.min(1, p.width / 20);
      const off = u * p.width * 0.5 * Math.cos(p.twist + u * 0.35) + wave;
      const x = p.x + p.nx * off;
      const y = p.sy + p.ny * off;
      if (p.k === 0) ctx.moveTo(x, y);
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
 * Fluxo de mana: fios iridescentes que descem a página em curvas, como mana fluindo. Cores da
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
      const view = {
        w: width,
        h: height,
        page: document.documentElement.scrollHeight,
        scrollY: window.scrollY,
      };
      draw(ctx, haze, view, offset + now / 1000, paletteRef.current, isDark());
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
    // A faixa acompanha a rolagem no mesmo quadro (sem esperar o ritmo de 30 quadros/s).
    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame((now) => {
        scrollFrame = 0;
        render(now);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
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
      window.removeEventListener('scroll', onScroll);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      reduce.removeEventListener('change', onMotion);
      redrawRef.current = () => {};
    };
  }, []);

  return <canvas ref={ref} className="mana-flow" aria-hidden="true" />;
}
