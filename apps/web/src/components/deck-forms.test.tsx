// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckImportForm } from './deck-forms';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockReset();
});

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>
        <DeckImportForm />
      </main>
    </NextIntlClientProvider>,
  );

describe('DeckImportForm', () => {
  it('quando o Moxfield bloqueia, mostra o passo a passo, muda para texto e foca o campo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'upstream_error',
              message: 'Moxfield respondeu 403',
              details: { source: 'moxfield', status: 403, url: 'https://moxfield.com/decks/abc' },
            },
          },
          { status: 502 },
        ),
      ),
    );
    const { container } = renderForm();
    fireEvent.change(screen.getByLabelText('Link do Archidekt ou Moxfield'), {
      target: { value: 'https://moxfield.com/decks/abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Importar deck' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O Moxfield não liberou a importação automática');
    expect(screen.getByRole('link', { name: /Abra o deck no Moxfield/ })).toHaveAttribute(
      'href',
      'https://moxfield.com/decks/abc',
    );
    expect(screen.getByRole('button', { name: 'Colar lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(screen.getByLabelText('Lista de cartas')).toHaveFocus());
    // Sem mensagem de erro genérica duplicada
    expect(screen.queryByText(/serviço externo/)).toBeNull();

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('outros erros externos continuam com a mensagem genérica', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'upstream_error', message: 'Archidekt 500' } },
          { status: 502 },
        ),
      ),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText('Link do Archidekt ou Moxfield'), {
      target: { value: 'https://archidekt.com/decks/1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Importar deck' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/serviço externo/);
    expect(screen.getByRole('button', { name: 'Link do Archidekt ou Moxfield' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('importa e navega para o deck', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ deck: { id: 'd1' }, notFound: [] }, { status: 201 })),
    );
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Colar lista' }));
    fireEvent.change(screen.getByLabelText('Lista de cartas'), { target: { value: '1 Sol Ring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importar deck' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/decks/d1'));
  });

  it('envia o formato escolhido (ou deixa detectar)', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ deck: { id: 'd1' }, notFound: [] }, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    fireEvent.change(screen.getByLabelText('Link do Archidekt ou Moxfield'), {
      target: { value: 'https://archidekt.com/decks/1' },
    });
    const select = screen.getByLabelText('Tipo de jogo');
    expect(select).toHaveValue('auto');
    fireEvent.change(select, { target: { value: 'modern' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importar deck' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/decks/d1'));
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toMatchObject({
      kind: 'url',
      format: 'modern',
    });
  });
});
