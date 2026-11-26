// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { CardScanButton } from './card-scanner';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

describe('CardScanButton (leitura pela câmera)', () => {
  it('sem permissão da câmera: avisa e deixa "Tirar foto"; nada a adicionar ainda', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) },
    });
    const onAdd = vi.fn();
    wrap(<CardScanButton onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ler pela câmera' }));
    const dialog = screen.getByRole('dialog', { name: 'Ler cartas pela câmera' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não deu para abrir a câmera',
    );
    expect(within(dialog).getByRole('button', { name: 'Tirar foto' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Ler carta' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    expect(within(dialog).getByText(/só o texto lido vai para o ArcanaKin/)).toBeInTheDocument();
    expect((await axe.run(dialog, { runOnly: ['wcag2a', 'wcag2aa'] })).violations).toEqual([]);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
