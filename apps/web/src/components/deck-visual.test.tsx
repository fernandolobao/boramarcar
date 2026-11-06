// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckCards } from './deck-cards';
import { ColorIdentity, DeckSettingsForm } from './deck-visual';

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
const lines = [
  {
    key: 'commander|omnath',
    name: 'Omnath, Locus of Mana',
    quantity: 1,
    proxies: 0,
    board: 'commander' as const,
    scryfallId: 'o',
    card: {
      ...card('Legendary Creature — Elemental', 'https://cards.scryfall.io/normal/o.jpg', 3),
      setCode: 'cmm',
      setName: 'Commander Masters',
      collectorNumber: '42',
    },
  },
  {
    key: 'mainboard|elvish',
    name: 'Elvish Mystic',
    quantity: 1,
    proxies: 1,
    board: 'mainboard' as const,
    scryfallId: 'e',
    card: { ...card('Creature — Elf', 'https://cards.scryfall.io/normal/e.jpg'), priceUsd: '0.50' },
  },
  {
    key: 'mainboard|forest',
    name: 'Forest',
    quantity: 30,
    proxies: 10,
    board: 'mainboard' as const,
    scryfallId: 'f',
    card: card('Basic Land — Forest', null, 0),
  },
  {
    key: 'maybeboard|x',
    name: 'Carta Inventada',
    quantity: 1,
    proxies: 0,
    board: 'maybeboard' as const,
    scryfallId: null,
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
    const { container } = wrap(<DeckCards deckId="d" lines={lines} isOwner usdBrl={5.4} />);
    expect(screen.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Comandante (1)',
      'Criaturas (1)',
      'Terrenos (30)',
      'Talvez (1)',
    ]);
    expect(screen.getByText('(Proxy)', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/10 proxies/, { selector: '.sr-only' })).toBeInTheDocument();
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
    expect(within(dialog).getByText(/Preço: US\$\s?0,50 ≈ R\$\s?2,70/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Ver preço na LigaMagic/ })).toHaveAttribute(
      'href',
      'https://www.ligamagic.com.br/?view=cards/card&card=Elvish%20Mystic',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(zoom).toHaveFocus();
  });

  it('modo lista mostra tabela e proxies em texto; sem modo de edição para quem não é dono', async () => {
    const { container } = wrap(<DeckCards deckId="d" lines={lines} isOwner={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('table')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Forest' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.getByText('10 proxies')).toBeInTheDocument();
    expect(screen.getByText('(não encontrada no Scryfall)')).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);
  });
});

describe('editor de deck', () => {
  const stubApi = () => {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({
          url,
          method: init?.method,
          body: init?.body ? JSON.parse(init.body as string) : undefined,
        });
        if (url.startsWith('/api/v1/cards/autocomplete')) {
          return Response.json({ names: ['Sol Ring', 'Solemn Simulacrum'] });
        }
        return Response.json({ found: true, line: { name: 'Sol Ring' } });
      }),
    );
    return calls;
  };

  it('muda quantidade e proxies (salva ao sair do campo) e remove com confirmação', async () => {
    const calls = stubApi();
    const { container } = wrap(<DeckCards deckId="d1" lines={lines} isOwner />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await audit(container)).toEqual([]);

    const proxies = screen.getByRole('spinbutton', { name: 'Proxies de Forest' });
    fireEvent.change(proxies, { target: { value: '12' } });
    fireEvent.blur(proxies);
    await screen.findByText('Forest salva.');
    expect(calls.at(-1)).toEqual({
      url: '/api/v1/decks/d1/lines',
      method: 'PUT',
      body: { name: 'Forest', board: 'mainboard', quantity: 30, proxies: 12, scryfallId: 'f' },
    });

    const qty = screen.getByRole('spinbutton', { name: 'Quantidade de Elvish Mystic' });
    fireEvent.change(qty, { target: { value: '0' } });
    fireEvent.keyDown(qty, { key: 'Enter' });
    expect(await screen.findByText('Proxies não podem passar da quantidade.')).toBeInTheDocument();

    const remove = screen.getByRole('button', { name: /Remover ?\(Carta Inventada\)/ });
    fireEvent.click(remove);
    expect(remove).toHaveTextContent('Confirmar');
    fireEvent.click(remove);
    await screen.findByText('Carta Inventada salva.');
    expect(calls.at(-1)!.body).toEqual({
      name: 'Carta Inventada',
      board: 'maybeboard',
      quantity: 0,
      proxies: 0,
      scryfallId: null,
    });
  });

  it('adiciona carta pela busca com autocompletar e teclado, somando ao que já existe', async () => {
    const calls = stubApi();
    const { container } = wrap(<DeckCards deckId="d1" lines={lines} isOwner />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const input = screen.getByRole('combobox', { name: 'Carta' });
    fireEvent.change(input, { target: { value: 'sol' } });
    const listbox = await screen.findByRole('listbox', {}, { timeout: 2000 });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Sol Ring', 'Solemn Simulacrum']);
    expect(await audit(container)).toEqual([]);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      within(listbox).getAllByRole('option')[0]!.id,
    );
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Sol Ring');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.change(screen.getByLabelText('Cópias'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Como proxy'));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar carta' }));
    await screen.findByText('Sol Ring adicionada.');
    expect(calls.at(-1)).toEqual({
      url: '/api/v1/decks/d1/lines',
      method: 'PUT',
      body: { name: 'Sol Ring', board: 'mainboard', quantity: 2, proxies: 2 },
    });

    // Carta que já está no deck: soma à quantidade atual.
    fireEvent.change(input, { target: { value: 'Forest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar carta' }));
    await vi.waitFor(() =>
      expect(calls.at(-1)!.body).toEqual({
        name: 'Forest',
        board: 'mainboard',
        quantity: 31,
        proxies: 10,
        scryfallId: 'f',
      }),
    );
  });

  it('troca a edição de parte das cópias pelo diálogo', async () => {
    const calls: { url: string; body?: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        if (url.startsWith('/api/v1/cards/prints')) {
          return Response.json({
            prints: [
              {
                scryfallId: 'f',
                name: 'Forest',
                setCode: 'cmm',
                setName: 'Commander Masters',
                collectorNumber: '1',
                imageUri: null,
                priceUsd: null,
              },
              {
                scryfallId: 'f2',
                name: 'Forest',
                setCode: 'lea',
                setName: 'Limited Edition Alpha',
                collectorNumber: '294',
                imageUri: null,
                priceUsd: '12.00',
              },
            ],
          });
        }
        return Response.json({ moved: 5 });
      }),
    );
    // jsdom não implementa showModal/close.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
    const { container } = wrap(<DeckCards deckId="d1" lines={lines} isOwner />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('button', { name: /Edição: CMM #42/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Escolher edição ?\(Forest\)$/ }));
    const alpha = await screen.findByRole('radio', { name: /Limited Edition Alpha/ });
    expect(screen.getByText('2 edições')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por edição ou número'), {
      target: { value: 'alpha' },
    });
    expect(screen.getByText('1 edição')).toBeInTheDocument();
    fireEvent.click(alpha);
    fireEvent.change(screen.getByLabelText('Cópias com esta edição (de 30)'), {
      target: { value: '5' },
    });
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta edição' }));
    await vi.waitFor(() =>
      expect(calls.at(-1)).toEqual({
        url: '/api/v1/decks/d1/lines/print',
        body: {
          name: 'Forest',
          board: 'mainboard',
          fromScryfallId: 'f',
          toScryfallId: 'f2',
          quantity: 5,
        },
      }),
    );
    expect(calls[0]!.url).toBe('/api/v1/cards/prints?name=Forest');
  });
});

describe('cartas de duas faces', () => {
  it('vira na grade e escolhe a face no diálogo', async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
    const dfc = {
      key: 'mainboard|delver',
      name: 'Delver of Secrets // Insectile Aberration',
      quantity: 1,
      proxies: 0,
      board: 'mainboard' as const,
      scryfallId: 'd',
      card: {
        ...card(
          'Creature — Human Wizard // Creature — Human Insect',
          'https://cards.scryfall.io/normal/front/d.jpg',
        ),
        backImageUri: 'https://cards.scryfall.io/normal/back/d.jpg',
        backName: 'Insectile Aberration',
      },
    };
    const { container } = wrap(<DeckCards deckId="d" lines={[dfc]} isOwner={false} />);
    const img = () => container.querySelector('li img')!.getAttribute('src');
    expect(img()).toContain('/front/');
    const flip = screen.getByRole('button', { name: /^Virar ?\(Delver of Secrets/ });
    fireEvent.click(flip);
    expect(flip).toHaveAttribute('aria-pressed', 'true');
    expect(img()).toContain('/back/');
    expect(await audit(container)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /Ampliar Delver/ }));
    const back = screen.getByRole('button', { name: 'Verso' });
    expect(back).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Insectile Aberration' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Frente' }));
    expect(
      screen.getByRole('img', { name: 'Delver of Secrets // Insectile Aberration' }),
    ).toBeInTheDocument();
    expect(img()).toContain('/front/');
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

  it('salva nome, tipo de jogo e visibilidade do deck', async () => {
    const fetchMock = vi.fn(async () => Response.json({ deck: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(<DeckSettingsForm deckId="d1" name="Omnath" format="commander" />);
    expect(await audit(container)).toEqual([]);
    fireEvent.change(screen.getByLabelText('Tipo de jogo'), { target: { value: 'brawl' } });
    expect(screen.getByRole('radio', { name: /Grupo/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Privado/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Deck salvo.');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/decks/d1');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Omnath',
      format: 'brawl',
      visibility: 'private',
    });
  });
});
