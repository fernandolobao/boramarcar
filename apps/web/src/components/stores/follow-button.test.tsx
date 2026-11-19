// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { FollowStoreButton } from './follow-button';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderIt = (props: Partial<Parameters<typeof FollowStoreButton>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <FollowStoreButton
        storeId="s1"
        slug="loja"
        storeName="Loja do Mago"
        following={false}
        signedIn
        {...props}
      />
    </NextIntlClientProvider>,
  );

describe('seguir loja (10.4)', () => {
  it('segue e passa a mostrar o estado, com aria-pressed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ following: true })));
    vi.stubGlobal('fetch', fetchMock);
    renderIt();
    const button = screen.getByRole('button', { name: /Seguir loja/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/stores/s1/follow',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/eventos novos e os avisos/);
  });

  it('sem conta: link para entrar e voltar à loja', () => {
    renderIt({ signedIn: false });
    expect(screen.getByRole('link', { name: 'Entre para seguir' })).toHaveAttribute(
      'href',
      '/entrar?para=%2Flojas%2Floja',
    );
  });
});
