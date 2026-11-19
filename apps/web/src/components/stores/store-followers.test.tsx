// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { StoreFollowersSection } from './store-followers';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('avisos para quem segue (10.4)', () => {
  it('mostra quantas pessoas seguem, conta os caracteres e envia o aviso', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ notice: { id: 'n1' }, notified: 2 }), { status: 201 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <StoreFollowersSection storeId="s1" count={2} notices={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('2 pessoas seguem a loja.')).toBeInTheDocument();
    const box = screen.getByRole('textbox', { name: 'Aviso para quem segue' });
    expect(box).toHaveAttribute('maxlength', '280');
    fireEvent.change(box, { target: { value: 'Chegou a coleção nova!' } });
    expect(screen.getByText('258 caracteres restantes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar aviso' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Aviso enviado para 2 pessoas.'),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      text: 'Chegou a coleção nova!',
    });
    expect(box).toHaveValue('');
  });
});
