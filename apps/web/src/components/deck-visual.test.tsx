// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { DeckCards, foilTiming } from './deck-cards';
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
      // O dono adiciona cartas no topo; editar uma carta é pelo diálogo dela.
      'Adicionar carta',
      'Comandante (1)',
      'Criaturas (1)',
      'Terrenos (30)',
      'Talvez (1)',
    ]);
    expect(screen.getByText('(Proxy)', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/10 proxies/, { selector: '.sr-only' })).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);

    const zoom = screen.getByRole('button', { name: 'Ver e editar Elvish Mystic' });
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
    expect(screen.queryByRole('group', { name: 'Editar no deck' })).not.toBeInTheDocument();
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

  it('edita a linha no diálogo da carta: quantidade, proxies, foil e remover com confirmação', async () => {
    const calls = stubApi();
    const { container } = wrap(<DeckCards deckId="d1" lines={lines} isOwner />);
    // Sem modo "Editar" separado: a carta abre o diálogo com o editor.
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver e editar Forest' }));
    let dialog = screen.getByRole('dialog', { name: 'Forest' });
    expect(within(dialog).getByRole('group', { name: 'Editar no deck' })).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);

    const proxies = within(dialog).getByRole('spinbutton', { name: 'Cópias proxy' });
    fireEvent.change(proxies, { target: { value: '12' } });
    fireEvent.blur(proxies);
    await within(dialog).findByText('Forest salva.');
    expect(calls.at(-1)).toEqual({
      url: '/api/v1/decks/d1/lines',
      method: 'PUT',
      body: {
        name: 'Forest',
        board: 'mainboard',
        quantity: 30,
        proxies: 12,
        scryfallId: 'f',
        foils: 0,
      },
    });

    // Foil: separar uma cópia vira outra carta (a versão foil); o total da linha não muda.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Separar 1 cópia foil' }));
    await within(dialog).findByText('Forest: 1 cópia foil.');
    expect(calls.at(-1)!.body).toMatchObject({ name: 'Forest', quantity: 30, foils: 1 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ver e editar Elvish Mystic' }));
    dialog = screen.getByRole('dialog', { name: 'Elvish Mystic' });
    const qty = within(dialog).getByRole('spinbutton', { name: 'Quantidade' });
    fireEvent.change(qty, { target: { value: '0' } });
    fireEvent.keyDown(qty, { key: 'Enter' });
    expect(
      await within(dialog).findByText('Proxies não podem passar da quantidade.'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ver e editar Carta Inventada' }));
    dialog = screen.getByRole('dialog', { name: 'Carta Inventada' });
    const remove = within(dialog).getByRole('button', { name: 'Remover do deck' });
    fireEvent.click(remove);
    expect(remove).toHaveTextContent('Confirmar remoção');
    fireEvent.click(remove);
    await within(dialog).findByText('Carta Inventada saiu do deck.');
    expect(calls.at(-1)!.body).toEqual({
      name: 'Carta Inventada',
      board: 'maybeboard',
      quantity: 0,
      proxies: 0,
      scryfallId: null,
      foils: 0,
    });
  });

  it('adiciona carta pela busca com autocompletar e teclado, somando ao que já existe', async () => {
    const calls = stubApi();
    const { container } = wrap(<DeckCards deckId="d1" lines={lines} isOwner />);
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
      method: 'POST',
      body: { name: 'Sol Ring', board: 'mainboard', quantity: 2, proxies: 2 },
    });

    // Carta que já está no deck: manda só as cópias novas; o servidor decide a pilha (a da edição
    // padrão), sem somar numa edição que a pessoa trocou.
    fireEvent.change(input, { target: { value: 'Forest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar carta' }));
    await vi.waitFor(() =>
      expect(calls.at(-1)).toEqual({
        url: '/api/v1/decks/d1/lines',
        method: 'POST',
        body: { name: 'Forest', board: 'mainboard', quantity: 1, proxies: 0 },
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
    fireEvent.click(screen.getByRole('button', { name: 'Ver e editar Omnath, Locus of Mana' }));
    expect(screen.getByRole('button', { name: /Edição: CMM #42/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver e editar Forest' }));
    fireEvent.click(screen.getByRole('button', { name: /^Escolher edição ?\(Forest\)$/ }));
    const alpha = await screen.findByRole('radio', { name: /Limited Edition Alpha/ });
    expect(screen.getByText('2 edições')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Edição, código, número ou ilustrador (ex.: pca 137, Tedin)'), {
      target: { value: 'alpha' },
    });
    expect(screen.getByText('1 edição')).toBeInTheDocument();
    fireEvent.click(alpha);
    expect(
      screen.getByText(
        'Para trocar a edição de só algumas cópias, abra a edição e escolha quantas.',
      ),
    ).toBeInTheDocument();
    const copies = screen.getByLabelText('Quantas cópias mudam de edição (de 30)');
    expect(copies).toHaveAccessibleDescription('Todas as cópias mudam.');
    fireEvent.change(copies, { target: { value: '5' } });
    expect(copies).toHaveAccessibleDescription(
      'As outras 25 cópias continuam na edição atual, numa pilha separada.',
    );
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta edição em 5 de 30' }));
    await vi.waitFor(() =>
      expect(calls.at(-1)).toEqual({
        url: '/api/v1/decks/d1/lines/print',
        body: {
          name: 'Forest',
          board: 'mainboard',
          fromScryfallId: 'f',
          toScryfallId: 'f2',
          quantity: 5,
          foil: false,
        },
      }),
    );
    expect(calls[0]!.url).toBe('/api/v1/cards/prints?name=Forest');
  });
});

describe('foil e comum da mesma edição', () => {
  it('são cartas separadas na grade, cada uma com o seu editor', async () => {
    const calls: { body: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        calls.push({ body: init?.body ? JSON.parse(init.body as string) : null });
        return Response.json({ found: true, line: { name: 'Plains' } });
      }),
    );
    const plains = {
      key: 'mainboard|plains|p',
      name: 'Plains',
      board: 'mainboard' as const,
      quantity: 2,
      proxies: 0,
      foils: 1,
      foil: false,
      scryfallId: 'p',
      card: { typeLine: 'Basic Land — Plains', cmc: 0, imageUri: 'https://x/p.jpg' },
    };
    const { container } = wrap(<DeckCards deckId="d1" lines={[plains]} isOwner />);
    const tiles = screen.getAllByRole('button', { name: 'Ver e editar Plains' });
    expect(tiles).toHaveLength(2);
    // Só a carta foil tem o selo.
    expect(screen.getAllByText('Foil', { exact: false })).not.toHaveLength(0);
    expect(await audit(container)).toEqual([]);

    // Abre a foil e desmarca: a cópia volta a ser comum (0 foil, total 2).
    fireEvent.click(tiles[1]!);
    const dialog = screen.getByRole('dialog', { name: 'Plains' });
    expect(
      within(dialog).getByRole('group', { name: 'Editar a versão foil no deck' }),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Foil/ }));
    await within(dialog).findByText('Plains: nenhuma cópia foil.');
    expect(calls.at(-1)!.body).toMatchObject({ quantity: 2, proxies: 0, foils: 0 });
    vi.unstubAllGlobals();
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

describe('foilTiming', () => {
  it('é estável para a mesma carta e muda entre cartas', () => {
    expect(foilTiming('sol-ring')).toEqual(foilTiming('sol-ring'));
    const keys = ['sol-ring', 'arcane-signet', 'command-tower', 'swords', 'rhystic-study'];
    const durs = new Set(keys.map((k) => (foilTiming(k) as Record<string, string>)['--foil-dur']));
    expect(durs.size).toBeGreaterThan(1);
  });

  it('fica entre 9 e 15s, com fase negativa dentro de uma volta', () => {
    for (const k of ['a', 'b', 'c', 'deck-1:Sol Ring', 'x'.repeat(40)]) {
      const v = foilTiming(k) as Record<string, string>;
      const dur = parseFloat(v['--foil-dur']!);
      const delay = parseFloat(v['--foil-delay']!);
      expect(dur).toBeGreaterThanOrEqual(9);
      expect(dur).toBeLessThanOrEqual(15);
      expect(delay).toBeLessThanOrEqual(0);
      expect(-delay).toBeLessThanOrEqual(dur);
    }
  });
});
