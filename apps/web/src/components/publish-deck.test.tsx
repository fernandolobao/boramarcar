// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { PublishDeck, type PublishCandidate } from './deck-forms';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const candidates: PublishCandidate[] = [
  {
    key: 'mainboard|sol ring|sol-b',
    name: 'Sol Ring',
    board: 'mainboard',
    fromScryfallId: 'sol-b',
    fromLabel: 'LTC #3',
    options: [
      { scryfallId: 'sol-a', foil: false, free: 1, label: 'CMM #400' },
      { scryfallId: 'sol-c', foil: true, free: 2, label: 'C21 #263' },
    ],
  },
];
const show = (c = candidates) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <PublishDeck deckId="d1" candidates={c} />
    </NextIntlClientProvider>,
  );

// O jsdom não tem `<dialog>` modal: o mínimo para o ModalButton abrir e fechar.
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
  replace.mockReset();
});

describe('PublishDeck', () => {
  it('com cartas na coleção: a janela pergunta carta a carta; o padrão é usar a da coleção', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deck: { id: 'd1' } }));
    vi.stubGlobal('fetch', fetchMock);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar deck' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('No deck: LTC #3')).toBeInTheDocument();
    const group = within(dialog).getByRole('radiogroup', { name: 'Sol Ring' });
    expect(within(group).getByRole('radio', { name: 'Usar a da coleção' })).toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publicar com estas escolhas' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/decks/d1?publicado=1'));
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.choices).toEqual([
      {
        name: 'Sol Ring',
        board: 'mainboard',
        fromScryfallId: 'sol-b',
        use: { scryfallId: 'sol-a', foil: false },
      },
    ]);
  });

  it('"adicionar como nova" manda a escolha sem usar a coleção', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deck: { id: 'd1' } }));
    vi.stubGlobal('fetch', fetchMock);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar deck' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Adicionar como nova à coleção' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publicar com estas escolhas' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.choices[0].use).toBeNull();
  });

  it('sem cartas na coleção: publica direto, sem janela', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ deck: { id: 'd1' } })),
    );
    show([]);
    fireEvent.click(screen.getByRole('button', { name: 'Publicar deck' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/decks/d1?publicado=1'));
  });
});
