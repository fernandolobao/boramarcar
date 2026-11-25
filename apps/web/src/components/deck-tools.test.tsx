// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckActions } from './deck-tools';
import { pick } from '@/test/select';

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
const edit = { name: 'Omnath', format: 'commander' as const, visibility: 'group' as const };
const menuButton = () => screen.getByRole('button', { name: /Opções do deck/ });
const openMenu = () => {
  fireEvent.click(menuButton());
  return screen.getByRole('menu', { name: 'Opções do deck' });
};
const choose = (name: string | RegExp) =>
  fireEvent.click(within(openMenu()).getByRole('menuitem', { name }));

describe('DeckActions (menu "Opções do deck")', () => {
  it('copia a lista, baixa o .txt, atualiza pela origem e pela lista colada', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes('/export')
        ? new Response('Deck\n1 Sol Ring\n')
        : Response.json({ added: ['A'], removed: [], changed: ['B', 'C'], notFound: [] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(
      <DeckActions deckId="d1" isOwner source="Archidekt" hasSourceUrl edit={edit} />,
    );
    expect((await axe.run(container)).violations).toEqual([]);

    const menu = openMenu();
    expect(within(menu).getByRole('menuitem', { name: 'Baixar .txt' })).toHaveAttribute(
      'href',
      '/api/v1/decks/d1/export?format=proxies&download=1',
    );
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Copiar com proxies (#proxy)' }));
    expect(await screen.findByText('Lista copiada.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('Deck\n1 Sol Ring\n');

    choose('Atualizar do Archidekt');
    expect(
      await screen.findByText(
        'Deck atualizado: 1 carta nova, nenhuma removida, 2 quantidades alteradas.',
      ),
    ).toBeInTheDocument();

    choose(/Colar lista atualizada/);
    const dialog = screen.getByRole('dialog', { name: 'Colar lista atualizada' });
    fireEvent.change(within(dialog).getByLabelText('Lista de cartas'), {
      target: { value: '1 Sol Ring' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Atualizar deck' }));
    });
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)![1]!.body))).toEqual({
      text: '1 Sol Ring',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('imprimir proxies abre a janela com cartas e papel', () => {
    wrap(
      <DeckActions
        deckId="d1"
        isOwner={false}
        source="Archidekt"
        hasSourceUrl={false}
        proxyCount={3}
      />,
    );
    choose(/Imprimir proxies/);
    const dialog = screen.getByRole('dialog', { name: 'Imprimir proxies' });
    const open = within(dialog).getByRole('link', { name: 'Abrir folha para imprimir' });
    expect(open).toHaveAttribute('href', '/decks/d1/imprimir?which=proxies&page=a4');
    fireEvent.click(within(dialog).getByLabelText('O deck todo'));
    pick('Papel', 'Carta (Letter)');
    expect(open).toHaveAttribute('href', '/decks/d1/imprimir?which=all&page=letter');
  });

  it('editar deck: salva, fecha e o foco volta ao menu; remover pede dois cliques', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ deck: {} }),
    );
    vi.stubGlobal('fetch', fetchMock);
    wrap(<DeckActions deckId="d1" isOwner source="Archidekt" hasSourceUrl={false} edit={edit} />);
    choose(/Editar deck/);
    let dialog = screen.getByRole('dialog', { name: 'Editar deck' });
    expect((await axe.run(dialog, { runOnly: ['wcag2a', 'wcag2aa'] })).violations).toEqual([]);
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(menuButton());

    choose(/Editar deck/);
    dialog = screen.getByRole('dialog', { name: 'Editar deck' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover deck Omnath' }));
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/decks/d1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /^Confirmar remoção/ }));
    });
    expect(push).toHaveBeenCalledWith('/decks');
  });

  it('quem não é dono só exporta e imprime', () => {
    wrap(<DeckActions deckId="d1" isOwner={false} source="Archidekt" hasSourceUrl />);
    const menu = openMenu();
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((i) => i.textContent);
    expect(names).toEqual([
      'Copiar lista',
      'Copiar com proxies (#proxy)',
      'Baixar .txt',
      'Imprimir proxies…',
    ]);
  });
});
