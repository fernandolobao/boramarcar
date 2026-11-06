// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { ColorIdentity, DeckCards, DeckSettingsForm } from './deck-visual';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

beforeAll(() => {
  // jsdom ainda não implementa <dialog> modal.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

const card = (typeLine: string, imageUri: string | null = null, cmc = 1) => ({
  typeLine,
  cmc,
  manaCost: '{1}{G}',
  imageUri,
});
const entries = [
  {
    id: 'c',
    name: 'Omnath, Locus of Mana',
    quantity: 1,
    board: 'commander' as const,
    isProxy: false,
    card: card('Legendary Creature — Elemental', 'https://cards.scryfall.io/normal/o.jpg', 3),
  },
  {
    id: 'e',
    name: 'Elvish Mystic',
    quantity: 1,
    board: 'mainboard' as const,
    isProxy: true,
    card: card('Creature — Elf', 'https://cards.scryfall.io/normal/e.jpg'),
  },
  {
    id: 'f',
    name: 'Forest',
    quantity: 30,
    board: 'mainboard' as const,
    isProxy: false,
    card: card('Basic Land — Forest', null, 0),
  },
  {
    id: 'x',
    name: 'Carta Inventada',
    quantity: 1,
    board: 'maybeboard' as const,
    isProxy: false,
    card: null,
  },
];

const audit = async (container: HTMLElement) =>
  (
    await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })
  ).violations.map((v) => v.id);

describe('DeckCards', () => {
  it('modo visual agrupa por tipo, amplia a carta em diálogo e devolve o foco', async () => {
    const { container } = wrap(<DeckCards deckId="d" entries={entries} isOwner />);
    expect(screen.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Comandante (1)',
      'Criaturas (1)',
      'Terrenos (30)',
      'Talvez (1)',
    ]);
    expect(screen.getByRole('checkbox', { name: 'Proxy: Elvish Mystic' })).toBeChecked();
    expect(await audit(container)).toEqual([]);

    const zoom = screen.getByRole('button', { name: 'Ampliar Elvish Mystic' });
    zoom.focus();
    fireEvent.click(zoom);
    const dialog = screen.getByRole('dialog', { name: 'Elvish Mystic' });
    expect(within(dialog).getByRole('img', { name: 'Elvish Mystic' })).toBeInTheDocument();
    expect(within(dialog).getByText('Creature — Elf')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('img', { name: 'Custo de mana: 1, verde' }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(zoom).toHaveFocus();
  });

  it('modo lista mostra tabela; quem não é dono vê "Proxy" em texto', async () => {
    const { container } = wrap(<DeckCards deckId="d" entries={entries} isOwner={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('table')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Forest' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('(não encontrada no Scryfall)')).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);
  });
});

describe('ColorIdentity e DeckSettingsForm', () => {
  it('identidade de cor usa os símbolos de mana e tem texto para leitores de tela', async () => {
    const { container } = wrap(<ColorIdentity colors={['G', 'U']} />);
    expect(screen.getByText('Identidade de cor: Azul, Verde')).toHaveClass('sr-only');
    expect([...container.querySelectorAll('i.ms')].map((i) => i.className)).toEqual([
      'ms ms-cost ms-shadow ms-u ',
      'ms ms-cost ms-shadow ms-g ',
    ]);
    expect(container.querySelector('i.ms')).toHaveAttribute('aria-hidden', 'true');
    expect(await audit(container)).toEqual([]);
  });

  it('salva nome e tipo de jogo do deck', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deck: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(<DeckSettingsForm deckId="d1" name="Omnath" format="commander" />);
    expect(await audit(container)).toEqual([]);
    fireEvent.change(screen.getByLabelText('Tipo de jogo'), { target: { value: 'brawl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Deck salvo.');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/decks/d1');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Omnath', format: 'brawl' });
  });
});
