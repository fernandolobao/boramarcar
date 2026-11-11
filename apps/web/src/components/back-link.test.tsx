// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { BackLink, isMainPage, parentPath, resetVisited } from './back-link';

const nav = vi.hoisted(() => ({ pathname: '/decks/1', back: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ back: nav.back, push: vi.fn(), refresh: vi.fn() }),
}));

const MAIN = ['/painel', '/disponibilidade', '/eventos', '/ranking', '/decks', '/grupo'];

function renderAt(pathname: string) {
  nav.pathname = pathname;
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <BackLink main={MAIN} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  nav.back.mockReset();
  resetVisited();
});

describe('parentPath / isMainPage', () => {
  it('sobe um nível, com exceções', () => {
    expect(parentPath('/decks/abc')).toBe('/decks');
    expect(parentPath('/decks/abc/imprimir')).toBe('/decks/abc');
    expect(parentPath('/eventos/historico')).toBe('/eventos');
    expect(parentPath('/jogadores/u1')).toBe('/grupo');
    expect(parentPath('/perfil')).toBe('/painel');
    expect(parentPath('/configuracoes')).toBe('/painel');
  });

  it('reconhece as páginas principais', () => {
    expect(isMainPage('/decks', MAIN)).toBe(true);
    expect(isMainPage('/decks/', MAIN)).toBe(true);
    expect(isMainPage('/decks/abc', MAIN)).toBe(false);
    expect(isMainPage('/perfil', MAIN)).toBe(false);
  });
});

describe('BackLink', () => {
  it('não aparece nas páginas principais', () => {
    renderAt('/ranking');
    expect(screen.queryByRole('link', { name: 'Voltar' })).toBeNull();
  });

  it('sem página anterior no app, é um link para a página mãe (sem history.back)', async () => {
    const { container } = renderAt('/decks/abc');
    const link = screen.getByRole('link', { name: 'Voltar' });
    expect(link.getAttribute('href')).toBe('/decks');
    fireEvent.click(link);
    expect(nav.back).not.toHaveBeenCalled();
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it('depois de navegar dentro do app, volta para a página anterior', () => {
    const { rerender } = renderAt('/painel');
    nav.pathname = '/jogadores/u1';
    rerender(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <BackLink main={MAIN} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Voltar' }));
    expect(nav.back).toHaveBeenCalledTimes(1);
  });

  it('Ctrl/Cmd+clique segue o link (nova aba), sem voltar', () => {
    renderAt('/eventos/e1');
    fireEvent.click(screen.getByRole('link', { name: 'Voltar' }), { ctrlKey: true });
    fireEvent.click(screen.getByRole('link', { name: 'Voltar' }), { metaKey: true });
    expect(nav.back).not.toHaveBeenCalled();
  });
});
