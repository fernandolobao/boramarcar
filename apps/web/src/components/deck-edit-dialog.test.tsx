// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckEditDialog } from './deck-edit-dialog';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

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
  push.mockReset();
  refresh.mockReset();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

describe('DeckEditDialog', () => {
  it('abre pelo botão, salva, fecha e atualiza a página; o foco volta ao botão', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deck: {} }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<DeckEditDialog deckId="d1" name="Omnath" format="commander" visibility="group" />);
    const open = screen.getByRole('button', { name: 'Editar deck' });
    expect(open).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Editar deck' });
    const results = await axe.run(dialog, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations.map((v) => v.id)).toEqual([]);

    fireEvent.change(within(dialog).getByLabelText('Nome do deck'), {
      target: { value: 'Omnath Ramp' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/decks/d1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
    // Fechar sem salvar também devolve o foco.
    fireEvent.click(open);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Editar deck' })).getByRole('button', {
        name: 'Fechar',
      }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it('remover o deck fica na zona de perigo e pede dois cliques', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<DeckEditDialog deckId="d1" name="Omnath" format="commander" visibility="group" />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar deck' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar deck' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover deck Omnath' }));
    expect(fetchMock).not.toHaveBeenCalled();
    const confirm = within(dialog).getByRole('button', { name: /^Confirmar remoção/ });
    await act(async () => {
      fireEvent.click(confirm);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/decks/d1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(push).toHaveBeenCalledWith('/decks');
  });
});
