// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { tableLayout } from '@boramarcar/core';
import { TableMode } from './table-mode';
import { pick, selectButton } from '@/test/select';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  push.mockReset();
});

const players = [
  { userId: 'a', name: 'Ana', confirmed: true, decks: [{ id: 'd1', name: 'Omnath' }] },
  { userId: 'b', name: 'Bia', confirmed: true, decks: [] },
  { userId: 'c', name: 'Caio', confirmed: false, decks: [] },
];
const audit = async (container: HTMLElement) =>
  (
    await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    })
  ).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);

describe('layout da mesa', () => {
  it('cada jogador fica virado para o seu lado, em sentido horário', () => {
    expect(tableLayout(2).seats.map((s) => s.rotate)).toEqual([180, 0]);
    expect(tableLayout(4).seats.map((s) => `${s.area}${s.rotate}`)).toEqual([
      'a90',
      'b270',
      'd270',
      'c90',
    ]);
    expect(tableLayout(5).seats).toHaveLength(5);
    expect(tableLayout(6).seats).toHaveLength(6);
  });
});

describe('modo mesa', () => {
  it('configura, joga com toque e segurar, e registra o resultado no encontro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ game: { id: 'g1' } }, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <TableMode eventId="e1" players={players} defaultFormat="commander" />
      </NextIntlClientProvider>,
    );

    // Configuração: confirmados já marcados, vida 40 em Commander, deck escolhido.
    expect(screen.getByLabelText('Vida inicial')).toHaveValue('40');
    expect(screen.getByRole('checkbox', { name: /Ana/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Caio/ })).not.toBeChecked();
    pick('1. Ana · deck', 'Omnath');
    fireEvent.click(screen.getByRole('button', { name: 'Descer Ana' }));
    expect(selectButton('2. Ana · deck')).toHaveTextContent('Omnath');
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));

    // Trocar lugares (para refletir onde cada um sentou): escolhe dois e troca; dá para voltar.
    const swapSeats = (first: string, second: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
      fireEvent.click(screen.getByRole('button', { name: 'Trocar lugares' }));
      fireEvent.click(
        screen.getByRole('button', { name: `Escolher ${first} para trocar de lugar` }),
      );
      expect(
        screen.getByRole('button', { name: new RegExp(`${first} escolhido`) }),
      ).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(
        screen.getByRole('button', { name: `Escolher ${second} para trocar de lugar` }),
      );
    };
    swapSeats('Bia', 'Ana');
    expect(screen.getByText('Bia e Ana trocaram de lugar.')).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem('bm-mesa:e1')!).players.map(
        (p: { userId: string }) => p.userId,
      ),
    ).toEqual(['a', 'b']);
    swapSeats('Ana', 'Bia');
    expect(screen.getByRole('button', { name: 'Menu da mesa' })).toBeInTheDocument();

    // Tabuleiro: toque tira 1, segurar tira 10.
    const minus = screen.getByRole('button', { name: /Tirar 1 de vida de Bia \(vida 40\)/ });
    fireEvent.click(minus);
    expect(screen.getByText('Bia: 39 de vida.')).toBeInTheDocument();
    const minusBia = screen.getByRole('button', { name: /Tirar 1 de vida de Bia \(vida 39\)/ });
    fireEvent.pointerDown(minusBia);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(minusBia);
    fireEvent.click(minusBia);
    expect(screen.getByText('Bia: 29 de vida.')).toBeInTheDocument();

    // Dano de comandante da Ana na Bia: tira vida até eliminar.
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    const dialog = screen.getByRole('dialog', { name: 'Bia' });
    for (let i = 0; i < 21; i++) {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Aumentar De Ana' }));
    }
    expect(screen.getByText('Bia: 8 de vida. 21 de dano de comandante')).toBeInTheDocument();
    // Sobrou um só: o diálogo do jogador fecha e o menu abre.
    expect(screen.queryByRole('dialog', { name: 'Bia' })).toBeNull();
    expect(await screen.findByText('Ana é o último na mesa!')).toBeInTheDocument();
    expect(await audit(container)).toEqual([]);

    // Desfazer devolve o dano e a vida: Bia volta para a mesa.
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(screen.getByText('Bia: 9 de vida.')).toBeInTheDocument();
    expect(screen.queryByText('Ana é o último na mesa!')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tirar 1 de vida de Bia/ }));
    expect(JSON.parse(localStorage.getItem('bm-mesa:e1')!).players[0].life).toBe(8);
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Bia' })).getByRole('button', {
        name: 'Aumentar De Ana',
      }),
    );
    expect(await screen.findByText('Ana é o último na mesa!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e registrar' }));

    expect(screen.getByRole('radio', { name: /Ana/ })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Turno da vitória (opcional)'), {
      target: { value: '7' },
    });
    fireEvent.blur(screen.getByLabelText('Turno da vitória (opcional)'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar partida' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/eventos/e1'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/events/e1/games');
    expect(JSON.parse(String(init!.body))).toMatchObject({
      format: 'commander',
      winningTurn: 7,
      players: [
        { userId: 'b', result: 'loss', eliminatedOrder: 1, seat: 1 },
        { userId: 'a', result: 'win', deckId: 'd1', seat: 2, eliminatedOrder: null },
      ],
    });
    expect(localStorage.getItem('bm-mesa:e1')).toBeNull();
    vi.useRealTimers();
  });
});

describe('tela acesa e tela cheia', () => {
  const start = (canChooseColors = false) => {
    const utils = render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <TableMode
          eventId="e1"
          players={players}
          defaultFormat="commander"
          canChooseColors={canChooseColors}
        />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    return utils;
  };

  it('as opções do jogador abrem viradas para ele (o aparelho fica no meio da mesa)', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <TableMode eventId="e1" players={players} defaultFormat="commander" />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    // Duas pessoas frente a frente: Ana em cima (180°), Bia embaixo (0°).
    fireEvent.click(screen.getByRole('button', { name: /opções de Ana/ }));
    expect(screen.getByRole('dialog', { name: 'Ana' }).style.rotate).toBe('180deg');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Ana' })).getByRole('button', { name: 'Fechar' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    expect(screen.getByRole('dialog', { name: 'Bia' }).style.rotate).toBe('0deg');
  });

  it('pede o wake lock ao começar e solta ao sair', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release, addEventListener: vi.fn() }));
    vi.stubGlobal('navigator', { ...navigator, wakeLock: { request } });
    start();
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    expect(
      await screen.findByText('Tela acesa enquanto a mesa estiver aberta.'),
    ).toBeInTheDocument();
    // Ao sair do tabuleiro (aqui, para registrar), solta o bloqueio.
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e registrar' }));
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it('sem a API (Chrome no iPhone), toca um vídeo invisível em loop para a tela não bloquear', async () => {
    const nav = { ...navigator };
    Reflect.deleteProperty(nav, 'wakeLock');
    vi.stubGlobal('navigator', nav);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { container } = start();
    await waitFor(() => expect(play).toHaveBeenCalled());
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    expect(screen.getByText('Tela acesa enquanto a mesa estiver aberta.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e registrar' }));
    expect(pause).toHaveBeenCalled();
  });

  it('quando o vídeo também é recusado, avisa para desligar o bloqueio automático', async () => {
    const nav = { ...navigator };
    Reflect.deleteProperty(nav, 'wakeLock');
    vi.stubGlobal('navigator', nav);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'));
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    expect(await screen.findByText(/Não deu para manter a tela acesa/)).toBeInTheDocument();
  });

  it('entra em tela cheia ao começar e dá para sair pelo menu', async () => {
    const requestFullscreen = vi.fn(async () => undefined);
    const exitFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    document.documentElement.requestFullscreen = requestFullscreen;
    document.exitFullscreen = exitFullscreen;
    start();
    expect(requestFullscreen).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    const toggle = screen.getByRole('button', { name: 'Tela cheia' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    await waitFor(() => expect(exitFullscreen).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
    Reflect.deleteProperty(document, 'exitFullscreen');
  });

  it('o glossário abre pelo menu, sem sair da partida (12.3)', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Glossário' }));
    const dialog = screen.getByRole('dialog', { name: 'Glossário' });
    fireEvent.change(within(dialog).getByLabelText(/Buscar no glossário/), {
      target: { value: 'toque' },
    });
    expect(within(dialog).getByText(/Toque mortífero/)).toBeInTheDocument();
    // Na mesa, sem links para as lições (sairiam da partida).
    expect(within(dialog).queryByRole('link')).toBeNull();
  });

  it('parceiros: "dois comandantes" separa o dano de cada comandante', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    let dialog = screen.getByRole('dialog', { name: 'Bia' });
    const toggle = within(dialog).getByRole('button', { name: 'Dois comandantes (parceiros)' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    fireEvent.click(screen.getByRole('button', { name: /opções de Ana/ }));
    dialog = screen.getByRole('dialog', { name: 'Ana' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Aumentar De Bia — 2º comandante' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Aumentar De Bia — 1º comandante' }),
    ).toBeInTheDocument();
  });

  it('sortear quem começa fecha o menu e o sorteado brilha até tocar na mesa', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sortear quem começa' }));
    // O menu fecha; o sorteado é anunciado e a área dele ganha o brilho.
    expect(screen.queryByRole('dialog', { name: 'Menu da mesa' })).toBeNull();
    expect(
      screen.getAllByText(/^(Ana|Bia) começa$/, { selector: '[role="status"]' }).length,
    ).toBeGreaterThan(0);
    expect(document.querySelectorAll('.table-spotlight')).toHaveLength(1);
    // Qualquer toque na mesa encerra o brilho.
    fireEvent.pointerDown(screen.getByRole('button', { name: /opções de Ana/ }));
    expect(document.querySelector('.table-spotlight')).toBeNull();
  });

  it('o brilho do sorteado some sozinho em 5 segundos', () => {
    vi.useFakeTimers();
    try {
      start();
      fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sortear quem começa' }));
      expect(document.querySelector('.table-spotlight')).not.toBeNull();
      act(() => vi.advanceTimersByTime(5000));
      expect(document.querySelector('.table-spotlight')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Morreu" tira da mesa por outro motivo (sobra o vencedor) e volta ao desmarcar', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    let dialog = screen.getByRole('dialog', { name: 'Bia' });
    expect(within(dialog).getByRole('button', { name: 'Concedeu' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Morreu' }));
    // Com dois na mesa, a Ana vence: o menu abre para encerrar.
    expect(screen.getByText('Ana é o último na mesa!')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Menu da mesa' })).getByRole('button', {
        name: 'Fechar',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    dialog = screen.getByRole('dialog', { name: 'Bia' });
    const died = within(dialog).getByRole('button', { name: 'Morreu' });
    expect(died).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(died);
    expect(died).toHaveAttribute('aria-pressed', 'false');
  });

  it('cor da área: só com a flag; a cor escolhida pinta a área do jogador e volta à padrão', async () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    expect(screen.queryByRole('group', { name: 'Cor da sua área' })).toBeNull();
    cleanup();

    start(true);
    fireEvent.click(screen.getByRole('button', { name: /opções de Bia/ }));
    const colors = screen.getByRole('group', { name: 'Cor da sua área' });
    expect(within(colors).getAllByRole('button')).toHaveLength(12);
    const area = screen.getByRole('region', { name: /Bia/ });
    const before = area.style.backgroundColor;
    fireEvent.click(within(colors).getByRole('button', { name: 'Rosa' }));
    expect(within(colors).getByRole('button', { name: 'Rosa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(area.style.backgroundColor).not.toBe(before);
    // A cor padrão da posição (Bia é a 2ª: azul) volta ao normal.
    fireEvent.click(within(colors).getByRole('button', { name: 'Azul' }));
    expect(area.style.backgroundColor).toBe(before);
    expect(await audit(colors)).toEqual([]);
  });

  it('sem API de tela cheia (iPhone), explica como instalar na tela inicial', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Menu da mesa' }));
    expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull();
    expect(screen.getByText(/adicione o ArcanaKin à tela inicial/)).toBeInTheDocument();
  });
});
