// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { tableLayout } from './layout';
import { TableMode } from './table-mode';

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
    expect(screen.getByLabelText('Vida inicial')).toHaveValue(40);
    expect(screen.getByRole('checkbox', { name: /Ana/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Caio/ })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('1. Ana · deck'), { target: { value: 'd1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descer Ana' }));
    expect(screen.getByLabelText('2. Ana · deck')).toHaveValue('d1');
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));

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
