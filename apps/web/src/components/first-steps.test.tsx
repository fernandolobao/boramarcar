// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';

const api = vi.fn(async () => ({ flag: 'checklist-dismissed' }));
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...(args as [])) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { FirstSteps } = await import('./first-steps');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ui = (
  <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
    <main id="conteudo" tabIndex={-1}>
      <FirstSteps
        steps={[
          { key: 'availability', done: true },
          { key: 'invite', done: false },
          { key: 'rsvp', done: false },
          { key: 'deck', done: false },
        ]}
        members={2}
        tableSize={3}
      />
    </main>
  </NextIntlClientProvider>
);

describe('FirstSteps', () => {
  it('mostra o progresso em texto e cada passo com o estado e o link', () => {
    render(ui);
    expect(screen.getByText('1 de 4 feitos')).toBeInTheDocument();
    const availability = screen.getByRole('link', { name: /Marque quando você pode jogar/ });
    expect(availability).toHaveAttribute('href', '/disponibilidade');
    expect(availability).toHaveTextContent('Feito');
    expect(screen.getByRole('link', { name: /Convide amigos/ })).toHaveTextContent(
      'Hoje o grupo tem 2',
    );
    expect(screen.getByRole('link', { name: /Importe um deck/ })).toHaveAttribute(
      'href',
      '/decks/importar',
    );
  });

  it('dispensar grava no servidor, esconde a lista e devolve o foco ao conteúdo', async () => {
    render(ui);
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar os primeiros passos' }));
    await waitFor(() => expect(screen.queryByText('Primeiros passos')).not.toBeInTheDocument());
    expect(api).toHaveBeenCalledWith('/api/v1/me/onboarding', {
      method: 'POST',
      body: { flag: 'checklist-dismissed' },
    });
    expect(document.activeElement?.id).toBe('conteudo');
  });
});
