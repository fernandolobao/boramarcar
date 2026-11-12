'use client';

import { useEffect, useRef, type RefObject } from 'react';

const outside = (dialog: HTMLDialogElement, event: MouseEvent | PointerEvent) => {
  const r = dialog.getBoundingClientRect();
  return (
    event.clientX < r.left ||
    event.clientX > r.right ||
    event.clientY < r.top ||
    event.clientY > r.bottom
  );
};

/**
 * Fecha o `<dialog>` modal com um clique no fundo escurecido (fora da caixa), como o Esc. O
 * clique só conta se começou e terminou fora: arrastar uma seleção de texto de dentro para fora
 * não fecha. Teclado e leitor de tela continuam com o Esc e o botão "Fechar".
 */
export function useLightDismiss(
  ref: RefObject<HTMLDialogElement | null>,
  /** Como fechar (padrão: `dialog.close()`), ex.: com uma animação. */
  dismiss?: () => void,
) {
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let startedOutside = false;
    const onPointerDown = (event: PointerEvent) => {
      startedOutside = event.target === dialog && outside(dialog, event);
    };
    const onClick = (event: MouseEvent) => {
      const close = startedOutside && event.target === dialog && outside(dialog, event);
      startedOutside = false;
      if (!close || !dialog.open) return;
      if (dismissRef.current) dismissRef.current();
      else dialog.close();
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('click', onClick);
    };
  }, [ref]);
}
