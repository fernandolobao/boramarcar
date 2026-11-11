// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { CardName, CardNames } from './card-dialog';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      {node}
    </NextIntlClientProvider>,
  );

// jsdom não implementa <dialog>.showModal/close.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

describe('nome de carta clicável', () => {
  it('abre a carta pelo nome (busca uma vez) e devolve o foco ao fechar', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({
        card: {
          name: 'Sol Ring',
          typeLine: 'Artifact',
          manaCost: '{1}',
          imageUri: 'https://cards.scryfall.io/sol.jpg',
          setName: 'Commander Masters',
          setCode: 'cmm',
          collectorNumber: '400',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(
      <p>
        Game Changers: <CardNames names={['Sol Ring', 'Mana Crypt']} />
      </p>,
    );
    const button = screen.getByRole('button', { name: 'Sol Ring' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/cards/named?name=Sol+Ring');
    expect(await screen.findByRole('img', { name: 'Sol Ring' })).toBeInTheDocument();
    expect(screen.getByText('Edição: Commander Masters (CMM #400)')).toBeInTheDocument();
    const results = await axe.run(container, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations.map((v) => v.id)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('avisa quando o Scryfall não conhece o nome', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ card: null })),
    );
    wrap(<CardName name="Carta Inventada" />);
    fireEvent.click(screen.getByRole('button', { name: 'Carta Inventada' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Carta não encontrada no Scryfall.');
  });
});
