'use client';

import { Children, useEffect, useRef, type ReactNode } from 'react';
import { planStack, stackFrame, type StackPlanItem } from './stack-layout';

/**
 * Seções em pilha de cartas: ao rolar, cada seção gruda um pouco abaixo da anterior e a próxima
 * desliza por cima, deixando à mostra só a faixa do título das de trás (CSS em `globals.css`,
 * cálculo em `stack-layout.ts`).
 *
 * - A seção de trás é cortada exatamente onde começa a da frente (nada aparece "através" dos
 *   vãos) e esmaece conforme é coberta.
 * - Seção mais alta que a tela não gruda: rola normal e empurra para cima a pilha anterior, como
 *   se fosse o fim dela; as seções seguintes começam uma pilha nova. Assim nada fica escondido
 *   nem passa por cima das faixas.
 * - Sem JavaScript, as seções ficam uma embaixo da outra. Foco dentro de uma seção coberta tira o
 *   corte e o esmaecimento dela e a traz para a frente (WCAG 2.4.11).
 */
const STACK_VARS = ['--stack-top', '--stack-push', '--stack-clip', '--stack-fade', '--stack-scale'];

export function StackSections({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children).filter(Boolean);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cards = Array.from(root.children) as HTMLElement[];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let plan: StackPlanItem[] = [];
    let pushes = cards.map(() => 0);
    let frame = 0;

    const metrics = () => {
      const style = getComputedStyle(root);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const read = (name: string, fallback: number) => {
        const value = style.getPropertyValue(name).trim();
        if (!value) return fallback;
        return value.endsWith('rem') ? parseFloat(value) * rem : parseFloat(value) || fallback;
      };
      return {
        base: read('--stack-base', rem),
        step: read('--stack-step', 3.5 * rem),
        cap: read('--stack-cap', 5),
        viewport: window.innerHeight,
      };
    };

    const replan = () => {
      plan = planStack(
        cards.map((c) => c.offsetHeight),
        metrics(),
      );
      plan.forEach((item, i) => {
        const card = cards[i]!;
        card.dataset.stack = item.sticky ? 'sticky' : 'flow';
        card.style.setProperty('--stack-top', `${item.top}px`);
      });
      update();
    };

    const update = () => {
      frame = 0;
      if (plan.length !== cards.length) return;
      const result = stackFrame({
        plan,
        heights: cards.map((c) => c.offsetHeight),
        // Topo sem o empurrão que já aplicamos (o transform muda o retângulo medido).
        naturalTops: cards.map((c, i) => c.getBoundingClientRect().top + pushes[i]!),
        step: metrics().step,
      });
      pushes = result.map((r) => r.push);
      result.forEach((r, i) => {
        const card = cards[i]!;
        card.style.setProperty('--stack-push', `${-r.push}px`);
        card.style.setProperty('--stack-clip', `${r.clip}px`);
        card.style.setProperty('--stack-fade', r.cover.toFixed(3));
        card.style.setProperty('--stack-scale', reduceMotion.matches ? '1' : r.scale.toFixed(4));
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    replan();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(replan);
    for (const card of cards) observer?.observe(card);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', replan);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', replan);
      if (frame) cancelAnimationFrame(frame);
      for (const card of cards) {
        delete card.dataset.stack;
        for (const name of STACK_VARS) card.style.removeProperty(name);
      }
    };
  }, [items.length]);

  return (
    <div ref={ref} className="stack-sections">
      {items.map((child, i) => (
        <div key={i} className="stack-card" style={{ zIndex: i + 1 }}>
          {child}
        </div>
      ))}
    </div>
  );
}
