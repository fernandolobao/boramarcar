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
  /** Fagulhas de luz que correm pela faixa. */
  sparks: number;
}

const DESKTOP: Shape = {
  center: 0.55,
  amplitude: 0.41,
  minWidth: 0.06,
  maxWidth: 0.24,
  strands: 72,
  sparks: 46,
};
const MOBILE: Shape = {
  center: 0.55,
  amplitude: 0.47,
  minWidth: 0.1,
  maxWidth: 0.38,
  strands: 44,
  sparks: 26,
};
/** Pontos do eixo no trecho à vista: muitos, para as curvas saírem lisas. */
const SEGMENTS = 140;
const STOPS = 12;
const TAU = Math.PI * 2;

const rgba = ([r, g, b]: [number, number, number], a: number) =>
  `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};
/** Ruído determinístico (0–1) para fagulhas e fios, sem `Math.random` a cada quadro. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Traça uma curva lisa pelos pontos (quadráticas entre os pontos médios). */
function smoothPath(ctx: CanvasRenderingContext2D, points: readonly { x: number; y: number }[]) {
  if (points.length < 2) return;
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i]!;
    const next = points[i + 1]!;
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  }
  const last = points[points.length - 1]!;
  ctx.lineTo(last.x, last.y);
}

/**
 * Mana fluindo pela página: uma faixa de fios de luz finos que desce a página inteira em curvas
 * (direita → esquerda → direita…), torcendo devagar como seda. Alguns fios são "raios" mais
 * brilhantes com um pulso de luz correndo por eles, e fagulhas sobem pela faixa. Por baixo, um
 * brilho desfocado (baixa resolução ampliada) dá o volume. No fim da página os fios se abrem e
 * esmaecem (em vez de convergirem num ponto).
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
  // Meia volta (de um lado ao outro) a cada ~1,6 tela, nunca menos de 900 px.
  const period = Math.max(900, h * 1.6);
  const axisX = (y: number) =>
    w *
    (shape.center +
      shape.amplitude * Math.cos((Math.PI * y) / period + 0.15 * Math.sin(t * 0.1 + y / h)));
  // Esmaece nos últimos ~70% de tela da página; ali a faixa se abre um pouco.
  const ending = (y: number) => smooth((page - y) / (h * 0.7));
  const width = (y: number) =>
    w *
    (shape.minWidth +
      (shape.maxWidth - shape.minWidth) *
        (0.5 + 0.5 * Math.cos((TAU * y) / (h * 1.3) + t * 0.06))) *
    (1 + 0.7 * (1 - ending(y)));
  // Torção lenta e contínua: dobras suaves, sem vincos.
  const twist = (y: number) =>
    (TAU * 0.55 * y) / h + 0.5 * Math.sin((Math.PI * y) / (h * 1.2) + t * 0.08) + t * 0.16;

  ctx.clearRect(0, 0, w, h);
  const from = Math.max(-h * 0.06, scrollY - h * 0.2);
  const to = Math.min(page, scrollY + h * 1.2);
  if (to <= from) return;

  // Eixo e normal em cada ponto (iguais para todos os fios), já em coordenadas da tela.
  const axis = Array.from({ length: SEGMENTS + 1 }, (_, k) => {
    const y = from + ((to - from) * k) / SEGMENTS;
    const dx = axisX(y + 4) - axisX(y - 4);
    const len = Math.hypot(dx, 8) || 1;
    return {
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
  const stopsAt = Array.from({ length: STOPS }, (_, k) => from + ((to - from) * k) / (STOPS - 1));
  const offsetOf = (p: (typeof axis)[number], u: number) =>
    u * p.width * 0.5 * Math.cos(p.twist + u * 0.3);

  // Brilho de fundo: poucos traços grossos em baixa resolução, ampliados (fica desfocado).
  const hw = haze.canvas.width;
  const hh = haze.canvas.height;
  const sx = hw / w;
  const sy = hh / h;
  haze.clearRect(0, 0, hw, hh);
  haze.lineCap = 'round';
  haze.lineJoin = 'round';
  for (let b = 0; b < 4; b += 1) {
    const u = -0.75 + (1.5 * b) / 3;
    const gradient = haze.createLinearGradient(0, top * sy, 0, bottom * sy);
    stopsAt.forEach((y, k) => {
      const color = sampleFlow(palette, (y / h) * 0.25 + u * 0.25 + t * 0.01);
      gradient.addColorStop(k / (STOPS - 1), rgba(color, ending(y)));
    });
    haze.strokeStyle = gradient;
    haze.globalAlpha = dark ? 0.12 : 0.07;
    haze.lineWidth = w * shape.maxWidth * 0.4 * sx;
    haze.beginPath();
    smoothPath(
      haze,
      axis.map((p) => ({
        x: (p.x + p.nx * offsetOf(p, u)) * sx,
        y: (p.sy + p.ny * offsetOf(p, u)) * sy,
      })),
    );
    haze.stroke();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  ctx.drawImage(haze.canvas, 0, 0, w, h);

  // Fios: cada um a uma distância do eixo; a torção (cos) dobra a faixa e junta os fios.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = shape.strands;
  for (let j = 0; j < n; j += 1) {
    const u = -1 + (2 * j) / (n - 1);
    // Um em cada ~9 fios é um "raio": mais claro, com um pulso de luz correndo.
    const ray = hash(j) > 0.84;
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    // Posição do pulso (0–1 do trecho à vista), cada raio no seu ritmo.
    const pulse = (t * (0.05 + 0.04 * hash(j + 7)) + hash(j + 3)) % 1.4;
    stopsAt.forEach((y, k) => {
      const f = k / (STOPS - 1);
      const tw = twist(y);
      const hue = u * 0.45 + (y / h) * 0.25 + 0.1 * Math.sin(tw) + t * 0.01;
      // A luz "bate" onde a faixa vira de frente.
      const light = 0.35 + 0.65 * Math.abs(Math.sin(tw + u * 0.5));
      const glow = ray ? Math.max(0, 1 - Math.abs(f - pulse) * 6) : 0;
      const base = sampleFlow(palette, hue);
      // No pulso, a cor vai para o branco: é a luz passando pelo fio.
      const color = base.map((c) => Math.round(c + (255 - c) * glow * 0.85)) as typeof base;
      gradient.addColorStop(f, rgba(color, (light * (ray ? 1 : 0.7) + glow) * ending(y)));
    });
    ctx.strokeStyle = gradient;
    ctx.lineWidth = ray ? 1.4 : 0.8;
    ctx.globalAlpha = (dark ? 0.5 : 0.5) * (0.55 + 0.45 * Math.abs(u)) * (ray ? 1.5 : 1);
    ctx.globalCompositeOperation = ray && dark ? 'lighter' : 'source-over';
    const points = axis.map((p) => {
      const wave = 2 * Math.sin(p.y / 55 + j * 0.37 + t * 0.5);
      const off = offsetOf(p, u) + wave;
      return { x: p.x + p.nx * off, y: p.sy + p.ny * off };
    });
    if (ray) {
      // Halo do raio: o mesmo traço, largo e bem transparente.
      const alpha = ctx.globalAlpha;
      const width = ctx.lineWidth;
      ctx.globalAlpha = alpha * 0.18;
      ctx.lineWidth = 6;
      ctx.beginPath();
      smoothPath(ctx, points);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
    }
    ctx.beginPath();
    smoothPath(ctx, points);
    ctx.stroke();
  }

  // Fagulhas: pontos de luz que sobem devagar pela faixa, piscando.
  ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  const span = to - from;
  for (let i = 0; i < shape.sparks; i += 1) {
    const speed = 18 + 30 * hash(i + 11);
    // Posição na página: cada fagulha dá a volta no trecho à vista, subindo.
    const y = from + ((((hash(i) * span - t * speed) % span) + span) % span);
    const u = hash(i + 5) * 2 - 1;
    const tw = twist(y);
    const off = u * width(y) * 0.5 * Math.cos(tw + u * 0.3);
    const dx = axisX(y + 4) - axisX(y - 4);
    const len = Math.hypot(dx, 8) || 1;
    const x = axisX(y) + (-8 / len) * off;
    const syy = y - scrollY + (dx / len) * off;
    const twinkle = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i + 2) * 2) + i);
    const alpha = twinkle * ending(y) * (dark ? 0.9 : 0.75);
    if (alpha < 0.02) continue;
    const r = 2 + 4 * hash(i + 9);
    const color = sampleFlow(palette, (y / h) * 0.25 + u * 0.45 + t * 0.01);
    const glow = ctx.createRadialGradient(x, syy, 0, x, syy, r * 3);
    glow.addColorStop(0, rgba([255, 255, 255], alpha));
    glow.addColorStop(0.25, rgba(color, alpha * 0.8));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, syy, r * 3, 0, TAU);
    ctx.fill();
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
