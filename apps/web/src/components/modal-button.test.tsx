// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { ModalButton } from './modal-button';

beforeAll(() => {
  // jsdom não implementa o <dialog> modal.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(cleanup);

describe('botão que abre um modal', () => {
  it('abre com título, mostra o conteúdo, fecha e devolve o foco ao botão', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <ModalButton label="Convidar" title="Convidar para o grupo" icon="share">
          <p>Conteúdo do convite</p>
        </ModalButton>
      </NextIntlClientProvider>,
    );
    const opener = screen.getByRole('button', { name: 'Convidar' });
    expect(opener).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByText('Conteúdo do convite')).toBeNull();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Convidar para o grupo' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do convite')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('Conteúdo do convite')).toBeNull();
    expect(opener).toHaveFocus();
  });
});
