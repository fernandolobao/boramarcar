// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { activity } from '@/lib/activity';
import { ActivityBar, isInternalNavigation } from './activity-bar';
import { useApiAction } from './use-api-action';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/painel',
  useSearchParams: () => new URLSearchParams(),
}));

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

afterEach(cleanup);

function SaveButton({ action }: { action: () => Promise<unknown> }) {
  const { run, pending } = useApiAction();
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={pending}
      onClick={() => void run(action)}
    >
      Salvar
    </button>
  );
}

describe('carregando', () => {
  it('o botão fica ocupado e desabilitado enquanto espera o servidor, e a barra aparece', async () => {
    let resolve: () => void = () => {};
    const action = () => new Promise<void>((r) => (resolve = r));
    wrap(
      <>
        <ActivityBar />
        <SaveButton action={action} />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(document.querySelector('.activity-bar')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');

    await act(async () => resolve());
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toBeDisabled();
    expect(document.querySelector('.activity-bar')).toBeNull();
    expect(activity.get()).toBe(false);
  });

  it('erro também libera o botão', async () => {
    wrap(<SaveButton action={() => Promise.reject(new Error('x'))} />);
    const button = screen.getByRole('button', { name: 'Salvar' });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).not.toHaveAttribute('aria-busy');
    expect(activity.get()).toBe(false);
  });

  it('só conta como mudança de página o link interno para outra página', () => {
    const location = window.location; // página atual: a raiz do jsdom
    const click = (html: string, init: MouseEventInit = {}) => {
      document.body.innerHTML = html;
      const a = document.querySelector('a')!;
      const e = new MouseEvent('click', { bubbles: true, button: 0, ...init });
      Object.defineProperty(e, 'target', { value: a });
      return isInternalNavigation(e, location);
    };
    expect(click('<a href="/decks">Decks</a>')).toBe('/decks');
    expect(click(`<a href="${location.pathname}">Esta página</a>`)).toBeNull();
    expect(click(`<a href="${location.pathname}#x">Âncora</a>`)).toBeNull();
    expect(click('<a href="https://scryfall.com">Fora</a>')).toBeNull();
    expect(click('<a href="/decks" target="_blank">Nova aba</a>')).toBeNull();
    expect(click('<a href="/api/v1/me/export" download>Baixar</a>')).toBeNull();
    expect(click('<a href="/decks">Decks</a>', { metaKey: true })).toBeNull();
  });
});
