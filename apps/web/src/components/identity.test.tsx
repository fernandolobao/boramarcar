// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckCards, type DeckLineView } from './deck-cards';
import { IdentityFix } from './identity-fix';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockReset();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

const line = (name: string, board: DeckLineView['board'], colorIdentity: string[]) => ({
  key: `${board}:${name}`,
  name,
  board,
  quantity: 1,
  proxies: 0,
  scryfallId: null,
  card: { typeLine: 'Instant', cmc: 1, manaCost: '{R}', colorIdentity },
});

const stubApi = () => {
  const calls: { url: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body as string) : undefined });
      if (url.startsWith('/api/v1/cards/autocomplete')) {
        return Response.json({ names: ['Lightning Bolt'] });
      }
      if (url.startsWith('/api/v1/cards/named')) {
        return Response.json({ card: { name: 'Lightning Bolt', colorIdentity: ['R'] } });
      }
      return Response.json({ found: true, line: { name: 'Lightning Bolt' }, moved: 1 });
    }),
  );
  return calls;
};

describe('identidade de cor no editor (11.5)', () => {
  const lines = [
    line('Omnath, Locus of Mana', 'commander', ['G']),
    line('Lightning Bolt', 'mainboard', ['R']),
    line('Counterspell', 'maybeboard', ['U']),
  ];

  it('carta fora da identidade mostra o aviso com as cores (no talvez, não)', async () => {
    stubApi();
    const { container } = wrap(
      <DeckCards
        deckId="d1"
        lines={lines}
        isOwner={false}
        identity={['G']}
        commanderLabel="Omnath, Locus of Mana"
      />,
    );
    expect(screen.getAllByText('Fora da identidade')).toHaveLength(1);
    expect(screen.getByText('vermelho', { exact: false })).toBeInTheDocument();
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it('busca filtrada pela identidade por padrão; avisa antes de adicionar e oferece o Talvez', async () => {
    const calls = stubApi();
    wrap(
      <DeckCards
        deckId="d1"
        lines={lines.slice(0, 1)}
        isOwner
        identity={['G']}
        commanderLabel="Omnath, Locus of Mana"
      />,
    );
    const filter = screen.getByRole('checkbox', {
      name: 'Só cartas da identidade de Omnath, Locus of Mana',
    });
    expect(filter).toBeChecked();
    const input = screen.getByRole('combobox', { name: /Carta/ });
    fireEvent.change(input, { target: { value: 'light' } });
    await waitFor(() =>
      expect(
        calls.some((c) => c.url.includes('/api/v1/cards/autocomplete?q=light&identity=G')),
      ).toBe(true),
    );
    // Tentar adicionar uma carta vermelha: avisa e não adiciona ainda.
    fireEvent.change(input, { target: { value: 'Lightning Bolt' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar carta' }));
    });
    expect(await screen.findByText(/está fora da identidade de Omnath/)).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/api/v1/decks/d1/lines')).toBe(false);
    expect(screen.getByRole('button', { name: 'Adicionar mesmo assim' })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao Talvez' }));
    });
    await waitFor(() =>
      expect(calls.find((c) => c.url === '/api/v1/decks/d1/lines')?.body).toMatchObject({
        name: 'Lightning Bolt',
        board: 'maybeboard',
      }),
    );
  });

  it('validação: "Mover para Talvez" e "Remover" (dois cliques) para o dono', async () => {
    const calls = stubApi();
    const { container } = wrap(
      <IdentityFix deckId="d1" name="Lightning Bolt" colors={['R']} canEdit />,
    );
    expect((await axe.run(container)).violations).toEqual([]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mover Lightning Bolt para Talvez' }));
    });
    expect(calls.at(-1)).toEqual({
      url: '/api/v1/decks/d1/lines/move',
      body: { name: 'Lightning Bolt', from: 'mainboard', to: 'maybeboard' },
    });
    expect(refresh).toHaveBeenCalled();
    const remove = screen.getByRole('button', { name: 'Remover Lightning Bolt do deck' });
    fireEvent.click(remove);
    expect(calls).toHaveLength(1);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar remoção de Lightning Bolt/ }));
    });
    expect(calls.at(-1)?.body).toEqual({ name: 'Lightning Bolt', from: 'mainboard', to: null });
  });

  it('quem não é dono só vê as cores', () => {
    stubApi();
    wrap(<IdentityFix deckId="d1" name="Lightning Bolt" colors={['R']} canEdit={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      within(screen.getByRole('main')).getByText(/Cores fora da identidade/),
    ).toBeInTheDocument();
  });
});
