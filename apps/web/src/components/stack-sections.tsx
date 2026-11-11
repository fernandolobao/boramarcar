'use client';

import { Children, useEffect, useRef, type ReactNode } from 'react';

/**
 * Seções em pilha de cartas: ao rolar, cada seção gruda um pouco abaixo da anterior e a
 * próxima desliza por cima, deixando à mostra o título das de trás (CSS em `globals.css`).
 * Aqui só se mede a altura de cada seção, para as mais altas que a tela grudarem pelo fim.
 */
export function StackSections({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const cards = Array.from(root.children) as HTMLElement[];
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        el.style.setProperty('--stack-h', `${el.offsetHeight}px`);
      }
    });
    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={ref} className="stack-sections">
      {Children.toArray(children)
        .filter(Boolean)
        .map((child, i) => (
          <div key={i} className="stack-card" style={{ '--stack-i': i } as React.CSSProperties}>
            {child}
          </div>
        ))}
    </div>
  );
}
