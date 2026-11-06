// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckRoles } from './deck-roles';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const zero = {
  ramp: 0,
  draw: 0,
  removal: 0,
  wipe: 0,
  tutor: 0,
  protection: 0,
  recursion: 0,
  counterspell: 0,
};
const empty = Object.fromEntries(Object.keys(zero).map((k) => [k, [] as string[]])) as Record<
  keyof typeof zero,
  string[]
>;

describe('DeckRoles', () => {
  it('mostra contagem × meta e busca alternativas por função', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({
        query: 'id<=g otag:ramp f:commander cmc<=3',
        cards: [
          {
            name: 'Arcane Signet',
            manaCost: '{2}',
            typeLine: 'Artifact',
            imageUri: null,
            priceUsd: '0.5',
            gameChanger: false,
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <DeckRoles
          deckId="d1"
          roles={{ ...zero, ramp: 2 }}
          cardsByRole={{ ...empty, ramp: ['Sol Ring', 'Cultivate'] }}
          targets={{ ramp: 10, draw: 10, removal: 8, wipe: 2 }}
          tagged={{ tagged: 1, total: 2 }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('heading', { name: /Ramp\s*2 cartas\s*meta: 10/ })).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 cartas com funções do Scryfall Tagger/)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Ver alternativas (Ramp)' });
    fireEvent.change(screen.getByLabelText('Custo até (Ramp)'), { target: { value: '2' } });
    fireEvent.click(button);
    expect(await screen.findByText('Arcane Signet')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/decks/d1/alternatives?role=ramp&maxCmc=2');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Ver todas no Scryfall/ })).toHaveAttribute(
      'href',
      expect.stringContaining('otag%3Aramp'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar alternativas (Ramp)' }));
    await waitFor(() => expect(screen.queryByText('Arcane Signet')).toBeNull());
  });
});
