// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { TournamentEntrants } from './tournament-actions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const members = [
  { userId: 'ana', name: 'Ana' },
  { userId: 'bia', name: 'Bia' },
  { userId: 'caio', name: 'Caio' },
];

describe('TournamentEntrants (inscrições)', () => {
  it('a inscrição que termina depois não apaga a pessoa escolhida enquanto isso', async () => {
    let finish: (r: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <TournamentEntrants
          tournamentId="t1"
          entrantSize={1}
          entrants={[]}
          members={members}
          me="ana"
          canManage
        />
      </NextIntlClientProvider>,
    );
    // "Me inscrever" ainda em andamento quando a organizadora escolhe a Bia.
    fireEvent.click(screen.getByRole('button', { name: 'Me inscrever' }));
    fireEvent.click(screen.getByRole('button', { name: /Pessoa/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Bia' }));
    await act(async () => {
      finish(Response.json({ entrant: { id: 'e1' } }));
    });
    expect(screen.getByRole('button', { name: /Pessoa/ })).toHaveTextContent('Bia');
    expect(screen.getByRole('button', { name: 'Inscrever' })).toBeEnabled();
  });
});
