// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { TitleWithTip } from './tip';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const renderIt = (dismissed: boolean) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <TitleWithTip id="collection" dismissed={dismissed}>
        <h1>Coleção</h1>
      </TitleWithTip>
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('dica com botão de informação', () => {
  it('na primeira vez aparece aberta; "Entendi" grava, fecha e o foco vai para o ⓘ', async () => {
    const fetchMock = vi.fn(async () => Response.json({ flag: 'tip-collection' }));
    vi.stubGlobal('fetch', fetchMock);
    renderIt(false);
    const toggle = screen.getByRole('button', { name: 'Dica sobre esta tela' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Dica' })).toHaveTextContent(
      'As cartas dos seus decks entram sozinhas',
    );
    // Não rouba o foco ao aparecer.
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi, dispensar a dica' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Dica' })).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/onboarding',
      expect.objectContaining({ body: JSON.stringify({ flag: 'tip-collection' }) }),
    );
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('já dispensada: só o ⓘ, que abre e fecha a dica sem gravar de novo', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderIt(true);
    expect(screen.queryByRole('region', { name: 'Dica' })).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Dica sobre esta tela' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('region', { name: 'Dica' })).toBeInTheDocument();
    expect(toggle).toHaveAttribute(
      'aria-controls',
      screen.getByRole('region', { name: 'Dica' }).id,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Entendi, dispensar a dica' }));
    expect(screen.queryByRole('region', { name: 'Dica' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
