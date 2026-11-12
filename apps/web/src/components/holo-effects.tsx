'use client';

import { useEffect } from 'react';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

type Tilt = { x: number; y: number; a: number };

const apply = (el: HTMLElement, tilt: Tilt | null) => {
  if (!tilt) {
    el.style.removeProperty('--hx');
    el.style.removeProperty('--hy');
    el.style.removeProperty('--ha');
    delete el.dataset.holoActive;
    return;
  }
  el.style.setProperty('--hx', tilt.x.toFixed(3));
  el.style.setProperty('--hy', tilt.y.toFixed(3));
  el.style.setProperty('--ha', tilt.a.toFixed(3));
  el.dataset.holoActive = '';
};

/** Ângulos do aparelho → inclinação (−1…1), corrigindo a rotação da tela (retrato/paisagem). */
export function orientationTilt(
  event: { beta: number | null; gamma: number | null },
  baseline: number,
  screenAngle: number,
): Tilt {
  const beta = (event.beta ?? 0) - baseline;
  const gamma = event.gamma ?? 0;
  const angle = ((screenAngle % 360) + 360) % 360;
  const [lr, fb] =
    angle === 90
      ? [beta, -gamma]
      : angle === 270
        ? [-beta, gamma]
        : angle === 180
          ? [-gamma, -beta]
          : [gamma, beta];
  const x = clamp(lr / 25);
  const y = clamp(fb / 25);
  return { x, y, a: Math.min(1, Math.hypot(x, y)) };
}

/**
 * Inclinação e brilho das cartas (`.holo`, CSS em globals.css), para toda a página:
 * - com mouse, a carta sob o ponteiro inclina e o reflexo segue o ponteiro;
 * - no celular (sem hover), as cartas à vista seguem a inclinação do aparelho
 *   (`deviceorientation`; no iPhone a permissão é pedida no primeiro toque numa carta).
 * Com "reduzir movimento", nada é ligado. Só decoração: nada depende disso.
 */
export function HoloEffects() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;
    const cleanups: (() => void)[] = [];

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let current: HTMLElement | null = null;
      let frame = 0;
      let last: PointerEvent | null = null;
      const update = () => {
        frame = 0;
        const event = last;
        if (!event) return;
        const el = (event.target as Element | null)?.closest?.<HTMLElement>('.holo') ?? null;
        if (el !== current) {
          if (current) apply(current, null);
          current = el;
        }
        if (!el) return;
        const r = el.getBoundingClientRect();
        apply(el, {
          x: clamp(((event.clientX - r.left) / r.width) * 2 - 1),
          y: clamp(((event.clientY - r.top) / r.height) * 2 - 1),
          a: 1,
        });
      };
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        last = event;
        if (!frame) frame = requestAnimationFrame(update);
      };
      const onLeave = () => {
        if (current) apply(current, null);
        current = null;
      };
      document.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        document.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        if (frame) cancelAnimationFrame(frame);
        onLeave();
      });
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      const visible = new Set<HTMLElement>();
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visible.add(el);
          else {
            visible.delete(el);
            apply(el, null);
          }
        }
      });
      let pending = 0;
      const watch = () => {
        pending = 0;
        document.querySelectorAll<HTMLElement>('.holo').forEach((el) => io.observe(el));
      };
      watch();
      const mo = new MutationObserver(() => {
        if (!pending) pending = requestAnimationFrame(watch);
      });
      mo.observe(document.body, { childList: true, subtree: true });

      let baseline: number | null = null;
      let frame = 0;
      let latest: DeviceOrientationEvent | null = null;
      const update = () => {
        frame = 0;
        if (!latest || latest.beta === null) return;
        // Ponto de partida: como a pessoa segura o aparelho; volta devagar para ele.
        baseline = baseline === null ? latest.beta : baseline * 0.97 + latest.beta * 0.03;
        const tilt = orientationTilt(latest, baseline, screen.orientation?.angle ?? 0);
        visible.forEach((el) => apply(el, tilt));
      };
      const onOrientation = (event: DeviceOrientationEvent) => {
        latest = event;
        if (!frame) frame = requestAnimationFrame(update);
      };
      const start = () => window.addEventListener('deviceorientation', onOrientation);
      const askable = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      let onFirstTouch: ((event: PointerEvent) => void) | null = null;
      if (typeof askable.requestPermission === 'function') {
        // iPhone: precisa de permissão, pedida num toque (gesto) numa carta.
        onFirstTouch = (event: PointerEvent) => {
          if (!(event.target as Element | null)?.closest?.('.holo')) return;
          document.removeEventListener('pointerdown', onFirstTouch!);
          askable.requestPermission!()
            .then((state) => state === 'granted' && start())
            .catch(() => {});
        };
        document.addEventListener('pointerdown', onFirstTouch);
      } else {
        start();
      }
      cleanups.push(() => {
        window.removeEventListener('deviceorientation', onOrientation);
        if (onFirstTouch) document.removeEventListener('pointerdown', onFirstTouch);
        if (frame) cancelAnimationFrame(frame);
        if (pending) cancelAnimationFrame(pending);
        io.disconnect();
        mo.disconnect();
        visible.forEach((el) => apply(el, null));
      });
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}

/** Camadas de brilho de uma carta `.holo`: reflexo (sempre) e holográfico (só foil). */
export function HoloLayers({ foil }: { foil: boolean }) {
  return (
    <>
      {foil && <span aria-hidden="true" className="holo-shine" />}
      <span aria-hidden="true" className="holo-glare" />
    </>
  );
}
