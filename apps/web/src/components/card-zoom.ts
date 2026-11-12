/**
 * "Zoom" da carta ao abrir o diálogo: a imagem clicada na lista cresce até o lugar da imagem no
 * diálogo (e volta ao fechar), com a mesma transição da arte do deck (View Transitions, classe
 * `morph` em `globals.css`). Sem suporte no navegador, com "reduzir movimento" ou quando quem
 * abriu não tem imagem (ex.: um nome de carta no texto), o diálogo só abre/fecha.
 */
const NAME = 'card-zoom';

let lastPointer: Element | null = null;
if (typeof window !== 'undefined') {
  // Safari não foca botões no clique: guardamos onde foi o último toque/clique.
  window.addEventListener('pointerdown', (e) => (lastPointer = e.target as Element), true);
}

const canZoom = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Imagem de quem abriu o diálogo (o elemento com foco ou o último clicado). */
export function openerImage(): HTMLElement | null {
  for (const el of [document.activeElement, lastPointer]) {
    if (!(el instanceof Element) || el.closest('dialog')) continue;
    const img = el instanceof HTMLImageElement ? el : el.querySelector('img');
    if (img && img.getBoundingClientRect().width > 0) return img;
  }
  return null;
}

const mark = (el: HTMLElement | null | undefined, on: boolean) => {
  if (!el) return;
  el.style.viewTransitionName = on ? NAME : '';
  el.style.setProperty('view-transition-class', on ? 'morph' : '');
};

/** Troca de estado com a imagem passando de `from` para o que `to()` devolver depois dela. */
export function zoom(
  from: HTMLElement | null | undefined,
  change: () => void,
  to: () => HTMLElement | null | undefined,
) {
  if (!from || !from.isConnected || !canZoom()) {
    change();
    return;
  }
  mark(from, true);
  let target: HTMLElement | null | undefined;
  const transition = document.startViewTransition(() => {
    mark(from, false);
    change();
    target = to();
    mark(target, true);
  });
  void transition.finished.finally(() => {
    mark(from, false);
    mark(target, false);
  });
}
