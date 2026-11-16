// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { Tip } from './tip';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Tip', () => {
  it('mostra a dica da tela, e "Entendi" grava a escolha e a esconde', async () => {
    const fetchMock = vi.fn(async () => Response.json({ flag: 'tip-collection' }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <main id="conteudo" tabIndex={-1}>
          <Tip id="collection" />
        </main>
      </NextIntlClientProvider>,
    );
    const tip = screen.getByRole('region', { name: 'Dica' });
    expect(tip).toHaveTextContent('As cartas dos seus decks entram sozinhas');
    // Não rouba o foco ao aparecer.
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi, dispensar a dica' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Dica' })).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/onboarding',
      expect.objectContaining({ body: JSON.stringify({ flag: 'tip-collection' }) }),
    );
    expect(document.activeElement).toBe(document.getElementById('conteudo'));
  });
});
