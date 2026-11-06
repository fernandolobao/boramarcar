// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { GameEditor } from './game-editor';
import { GameForm } from './game-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const players = ['Ana', 'Bia', 'Caio', 'Dani', 'Edu'].map((name) => ({
  userId: name.toLowerCase(),
  name,
  decks: name === 'Ana' ? [{ id: 'omnath', name: 'Omnath' }] : [],
}));

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

const captureFetch = () => {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ game: {} }));
  vi.stubGlobal('fetch', fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return { url, method: init.method, body: JSON.parse(init.body as string) };
  };
};

describe('GameForm', () => {
  it('commander: 4 primeiros jogando, vencedor, deck, detalhes e ordem de eliminação', async () => {
    const lastCall = captureFetch();
    wrap(<GameForm eventId="e1" defaultFormat="commander" players={players} />);

    expect(screen.getByText('Selecione de 2 a 8 jogadores (4 selecionados).')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Registrar partida' });
    expect(submit).toBeDisabled(); // falta o vencedor

    fireEvent.click(screen.getByRole('radio', { name: 'Venceu: Ana' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck de Ana' }), {
      target: { value: 'omnath' },
    });
    fireEvent.change(screen.getByLabelText('Quem começou'), { target: { value: 'caio' } });
    fireEvent.change(screen.getByLabelText('Turno em que acabou'), { target: { value: '9' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Caio' }), { target: { value: '1' } });
    fireEvent.click(submit);

    await waitFor(() => expect(lastCall().url).toBe('/api/v1/events/e1/games'));
    const { body, method } = lastCall();
    expect(method).toBe('POST');
    expect(body).toMatchObject({ format: 'commander', firstPlayerId: 'caio', winningTurn: 9 });
    expect(body.players).toEqual([
      {
        userId: 'ana',
        seat: 1,
        team: null,
        result: 'win',
        deckId: 'omnath',
        eliminatedOrder: null,
      },
      { userId: 'bia', seat: 2, team: null, result: 'loss', deckId: null, eliminatedOrder: null },
      { userId: 'caio', seat: 3, team: null, result: 'loss', deckId: null, eliminatedOrder: 1 },
      { userId: 'dani', seat: 4, team: null, result: 'loss', deckId: null, eliminatedOrder: null },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent('Partida salva.');
  });

  it('trocar para um duelo deixa 2 jogadores; 2HG monta times e vence o time', async () => {
    const lastCall = captureFetch();
    wrap(<GameForm eventId="e1" defaultFormat="commander" players={players} />);
    const format = screen.getByLabelText('Tipo de jogo');

    fireEvent.change(format, { target: { value: 'modern' } });
    expect(screen.getByText('Selecione 2 jogadores (2 selecionados).')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Caio' })).not.toBeChecked();

    fireEvent.change(format, { target: { value: 'two_headed_giant' } });
    expect(screen.getByText('Selecione 4 jogadores (4 selecionados).')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Time de Caio' })).toHaveValue('1');
    expect(screen.queryByRole('radio', { name: /Venceu/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Time 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar partida' }));

    await waitFor(() => expect(lastCall().body.format).toBe('two_headed_giant'));
    expect(
      lastCall().body.players.map((p: { userId: string; team: number; result: string }) => [
        p.userId,
        p.team,
        p.result,
      ]),
    ).toEqual([
      ['ana', 1, 'loss'],
      ['bia', 2, 'win'],
      ['caio', 1, 'loss'],
      ['dani', 2, 'win'],
    ]);
  });
});

describe('GameEditor', () => {
  it('abre a edição, salva com PUT e devolve o foco ao botão', async () => {
    const lastCall = captureFetch();
    wrap(
      <GameEditor
        gameId="g1"
        number={2}
        players={players}
        initial={{
          format: 'standard',
          firstPlayerId: null,
          winningTurn: null,
          durationMinutes: null,
          notes: null,
          players: [
            { userId: 'ana', result: 'win', deckId: null, team: null, eliminatedOrder: null },
            { userId: 'bia', result: 'loss', deckId: null, team: null, eliminatedOrder: null },
          ],
        }}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Editar partida 2' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Tipo de jogo')).toHaveValue('standard');
    fireEvent.click(screen.getByRole('radio', { name: 'Venceu: Bia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar partida' }));

    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
    expect(lastCall()).toMatchObject({ url: '/api/v1/games/g1', method: 'PUT' });
    expect(lastCall().body.players.map((p: { result: string }) => p.result)).toEqual([
      'loss',
      'win',
    ]);
    expect(toggle).toHaveFocus();
  });
});
