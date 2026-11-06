// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckTools } from './deck-tools';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
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

describe('DeckTools', () => {
  it('copia a lista, atualiza pela origem e por texto colado', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
      url.includes('/export')
        ? new Response('Deck\n1 Sol Ring\n')
        : Response.json({
            added: ['A'],
            removed: [],
            changed: ['B', 'C'],
            notFound: [],
            _body: init?.body,
          }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(<DeckTools deckId="d1" isOwner source="Archidekt" hasSourceUrl />);
    expect((await axe.run(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Copiar com proxies (#proxy)' }));
    expect(await screen.findByText('Lista copiada.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/decks/d1/export?format=proxies');
    expect(writeText).toHaveBeenCalledWith('Deck\n1 Sol Ring\n');
    expect(screen.getByRole('link', { name: 'Baixar .txt' })).toHaveAttribute(
      'href',
      '/api/v1/decks/d1/export?format=proxies&download=1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar do Archidekt' }));
    expect(
      await screen.findByText(
        'Deck atualizado: 1 carta nova, nenhuma removida, 2 quantidades alteradas.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Lista de cartas'), { target: { value: '1 Sol Ring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar deck' }));
    await vi.waitFor(() =>
      expect(JSON.parse(String(fetchMock.mock.calls.at(-1)![1]!.body))).toEqual({
        text: '1 Sol Ring',
      }),
    );
  });

  it('quem não é dono só exporta', () => {
    wrap(<DeckTools deckId="d1" isOwner={false} source="Archidekt" hasSourceUrl />);
    expect(screen.queryByRole('button', { name: /Atualizar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar lista' })).toBeInTheDocument();
  });
});
