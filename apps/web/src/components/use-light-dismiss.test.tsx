// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLightDismiss } from './use-light-dismiss';

function Modal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLightDismiss(ref);
  return (
    <dialog ref={ref} open onClose={onClose} data-testid="dialog">
      <p data-testid="inside">Conteúdo</p>
    </dialog>
  );
}

const setup = () => {
  const onClose = vi.fn();
  const view = render(<Modal onClose={onClose} />);
  const dialog = view.getByTestId('dialog') as HTMLDialogElement;
  // Caixa do diálogo de 100,100 a 300,300; o resto é o fundo escurecido.
  dialog.getBoundingClientRect = () =>
    ({ left: 100, right: 300, top: 100, bottom: 300 }) as DOMRect;
  dialog.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
    onClose();
  });
  return { dialog, onClose, inside: view.getByTestId('inside') };
};

afterEach(cleanup);

describe('useLightDismiss', () => {
  it('fecha com clique no fundo (fora da caixa)', () => {
    const { dialog, onClose } = setup();
    fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha com clique dentro, nem no espaço interno da própria caixa', () => {
    const { dialog, onClose, inside } = setup();
    fireEvent.pointerDown(inside, { clientX: 150, clientY: 150 });
    fireEvent.click(inside, { clientX: 150, clientY: 150 });
    fireEvent.pointerDown(dialog, { clientX: 105, clientY: 105 });
    fireEvent.click(dialog, { clientX: 105, clientY: 105 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('arrastar uma seleção de dentro para fora não fecha', () => {
    const { dialog, onClose, inside } = setup();
    fireEvent.pointerDown(inside, { clientX: 150, clientY: 150 });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(onClose).not.toHaveBeenCalled();
  });
});
