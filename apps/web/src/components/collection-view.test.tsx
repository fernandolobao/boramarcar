// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { CollectionView, type CollectionViewEntry } from './collection-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/colecao',
}));

const card = (over: Partial<NonNullable<CollectionViewEntry['card']>>) => ({
  scryfallId: 'x',
  name: 'x',
  cmc: 0,
  typeLine: '',
  colors: [],
  colorIdentity: [],
  imageUri: null,
  setCode: 'c21',
  setName: 'Commander 2021',
  collectorNumber: '1',
  releasedAt: '2021-04-23',
  artist: 'Mike Bierek',
  rarity: 'uncommon',
  priceUsd: '1.50',
  priceUsdFoil: '4.00',
  ...over,
});

const entries: CollectionViewEntry[] = [
  {
    id: 'e1',
    name: 'Sol Ring',
    scryfallId: 'sol',
    quantity: 3,
    foil: false,
    card: card({ scryfallId: 'sol', name: 'Sol Ring', cmc: 1, typeLine: 'Artifact' }),
    addedAt: '2026-01-01T00:00:00Z',
    decks: [{ deckId: 'd1', deckName: 'Omnath Ramp', quantity: 1, proxies: 0 }],
  },
  {
    id: 'e2',
    name: 'Cultivate',
    scryfallId: 'cult',
    quantity: 1,
    foil: true,
    card: card({
      scryfallId: 'cult',
      name: 'Cultivate',
      cmc: 3,
      typeLine: 'Sorcery',
      colorIdentity: ['G'],
      setCode: 'm21',
      setName: 'Core Set 2021',
      releasedAt: '2020-07-03',
      artist: 'Anthony Palumbo',
      rarity: 'common',
      priceUsd: '0.30',
      priceUsdFoil: '1.00',
    }),
    addedAt: '2026-02-01T00:00:00Z',
    decks: [],
  },
];

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );
const audit = async (el: HTMLElement) =>
  (
    await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })
  ).violations.map((v) => v.id);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CollectionView', () => {
  it('totais com valor (foil pelo preço foil) em reais e dólar', async () => {
    const { container } = wrap(
      <CollectionView entries={entries} brlRate={5} rateDate="2026-11-10" />,
    );
    expect(screen.getByText('4 cópias')).toBeTruthy();
    expect(screen.getByText('2 cartas diferentes')).toBeTruthy();
    // 3 × 1,50 + 1 × 4,00 (foil) = US$ 5,50 → R$ 27,50
    expect(screen.getByTestId('collection-value').textContent).toMatch(/27,50.*5\.50|27,50.*5,50/);
    expect(await audit(container)).toEqual([]);
  });

  it('filtros: cor, custo, tipo, foil, em deck; limpar volta tudo', () => {
    wrap(<CollectionView entries={entries} brlRate={null} rateDate={null} />);
    const status = () =>
      screen.getAllByRole('status').find((s) => /linhas? de/.test(s.textContent ?? ''))
        ?.textContent;
    expect(status()).toMatch(/^2 linhas de 2/);
    fireEvent.click(screen.getByRole('button', { name: /verde/i }));
    expect(status()).toMatch(/^1 linha de 2/);
    expect(screen.getByRole('button', { name: /verde/i }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(status()).toMatch(/^2 linhas/);

    fireEvent.change(screen.getByLabelText('Em decks'), { target: { value: 'yes' } });
    expect(screen.getByRole('button', { name: /^Ver e editar Sol Ring/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Ver e editar Cultivate/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Em decks'), { target: { value: 'all' } });

    fireEvent.change(screen.getByLabelText('Acabamento'), { target: { value: 'foil' } });
    expect(status()).toMatch(/^1 linha/);
    fireEvent.change(screen.getByLabelText('Acabamento'), { target: { value: 'all' } });

    fireEvent.click(screen.getByRole('button', { name: 'Feitiço' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(status()).toMatch(/^0 linhas/);
  });

  it('lista em tabela com edição, raridade, ano, ilustrador e decks', async () => {
    const { container } = wrap(<CollectionView entries={entries} brlRate={null} rateDate={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    const table = screen.getByRole('table');
    const row = within(table).getAllByRole('row')[2]!; // ordem por nome: Cultivate, Sol Ring
    expect(row.textContent).toContain('C21 #1');
    expect(row.textContent).toContain('Incomum');
    expect(row.textContent).toContain('2021');
    expect(row.textContent).toContain('Mike Bierek');
    expect(row.textContent).toContain('Omnath Ramp');
    expect(await audit(container)).toEqual([]);
  });

  it('diálogo: decks com a carta, mudar quantidade e remover em dois cliques', async () => {
    const fetchMock = vi.fn(async () => Response.json({ removed: false }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<CollectionView entries={entries} brlRate={null} rateDate={null} />);
    fireEvent.click(screen.getByRole('button', { name: /^Ver e editar Sol Ring/ }));
    const link = within(document.querySelector('dialog')!).getByRole('link', {
      name: /Omnath Ramp: 1 cópia/,
    });
    expect(link.getAttribute('href')).toBe('/decks/d1');
    const dialog = document.querySelector('dialog')!;
    const qty = within(dialog).getByLabelText('Cópias');
    fireEvent.change(qty, { target: { value: '5' } });
    await act(async () => {
      fireEvent.keyDown(qty, { key: 'Enter' });
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/collection/e1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ quantity: 5 }) }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover da coleção' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar remoção' }));
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/collection/e1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('adicionar: escolhe a edição antes, e só então adiciona (com a impressão escolhida)', async () => {
    const prints = [
      {
        scryfallId: 'mtn-ltr',
        setCode: 'ltr',
        setName: 'The Lord of the Rings',
        collectorNumber: '268',
        imageUri: null,
        priceUsd: '0.10',
      },
      {
        scryfallId: 'mtn-dmu',
        setCode: 'dmu',
        setName: 'Dominaria United',
        collectorNumber: '269',
        imageUri: null,
        priceUsd: null,
      },
    ];
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/cards/prints')) return Response.json({ prints });
      if (String(url).includes('/autocomplete')) return Response.json({ names: [] });
      return Response.json({ added: true, name: 'Mountain' }, { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(<CollectionView entries={entries} brlRate={null} rateDate={null} />);
    const form = screen.getByRole('form', { name: 'Adicionar cartas' });
    const add = within(form).getByRole('button', { name: 'Adicionar' });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Carta' }), {
      target: { value: 'Mountain' },
    });
    // Sem edição escolhida, não adiciona.
    expect(add).toBeDisabled();
    await act(async () => {
      fireEvent.click(within(form).getByRole('button', { name: /Escolher edição/ }));
    });
    const picker = document.querySelector('dialog[open]') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(picker).getByRole('radio', { name: /Dominaria United/ }));
    });
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: 'Escolher esta edição' }));
    });
    // A escolha não envia nada; a edição aparece no formulário.
    expect(fetchMock.mock.calls.filter(([u]) => String(u) === '/api/v1/collection')).toHaveLength(
      0,
    );
    expect(within(form).getByText('Dominaria United')).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /Trocar edição/ })).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText('Cópias'), { target: { value: '2' } });
    await act(async () => {
      fireEvent.click(add);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/collection',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Mountain', scryfallId: 'mtn-dmu', quantity: 2, foil: false }),
      }),
    );
    expect(await audit(container)).toEqual([]);
  });

  it('separar cópias: parte da pilha vai para outro acabamento (ou edição)', async () => {
    const fetchMock = vi.fn(async () => Response.json({ removed: false }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<CollectionView entries={entries} brlRate={null} rateDate={null} />);
    fireEvent.click(screen.getByRole('button', { name: /^Ver e editar Sol Ring/ }));
    const dialog = document.querySelector('dialog')!;
    const split = within(dialog).getByRole('form', { name: 'Separar ou mudar cópias' });
    // Nada muda ainda: o botão espera outra edição ou outro acabamento.
    expect(within(split).getByRole('button', { name: 'Mover 1 cópia' })).toBeDisabled();
    fireEvent.change(within(split).getByLabelText('Quantas (de 3)'), { target: { value: '2' } });
    fireEvent.click(within(split).getByLabelText(/Foil/));
    await act(async () => {
      fireEvent.click(within(split).getByRole('button', { name: 'Mover 2 cópias' }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/collection/e1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ foil: true, copies: 2 }),
      }),
    );
  });
});
