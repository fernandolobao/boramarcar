/**
 * Atividade em andamento no navegador (ações na API e mudanças de página), para mostrar a barra
 * de carregamento no topo. Um contador simples com assinantes (`useSyncExternalStore`).
 */
let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const activity = {
  start() {
    active++;
    emit();
  },
  done() {
    active = Math.max(0, active - 1);
    emit();
  },
  get: () => active > 0,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/*
 * Último botão apertado (clique ou teclado), para mostrar o carregamento nele. O Safari não dá
 * foco a botões no clique, então `document.activeElement` não basta.
 */
let lastPressed: { el: HTMLElement; at: number } | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('button, [role="button"]');
      if (el instanceof HTMLElement) lastPressed = { el, at: Date.now() };
    },
    true,
  );
}

/** O botão que disparou a ação: o último apertado (há menos de 1 s) ou o enviar do formulário. */
export function pressedButton(): HTMLElement | null {
  if (lastPressed && Date.now() - lastPressed.at < 1000 && lastPressed.el.isConnected) {
    return lastPressed.el;
  }
  const focused = document.activeElement;
  if (focused instanceof HTMLButtonElement) return focused;
  const form = focused?.closest?.('form');
  return form?.querySelector<HTMLElement>('button[type="submit"]') ?? null;
}
