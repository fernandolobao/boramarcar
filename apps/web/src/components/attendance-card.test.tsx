// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { AttendanceCard } from './attendance-card';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const now = new Date('2026-11-15T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600_000).toISOString();
const members = [
  { userId: 'u1', name: 'Ana', attended: 8, of: 8, lastGameAt: daysAgo(3), awaySince: null },
  {
    userId: 'u2',
    name: 'Bia',
    attended: 1,
    of: 8,
    lastGameAt: daysAgo(50),
    awaySince: daysAgo(42),
  },
  { userId: 'u3', name: 'Caio', attended: 7, of: 8, lastGameAt: daysAgo(3), awaySince: null },
  { userId: 'u4', name: 'Duda', attended: 0, of: 2, lastGameAt: null, awaySince: null },
];
const nextEvent = { id: 'e1', title: 'Commander de quinta', startsAt: '2026-11-20T22:30:00.000Z' };

const renderIt = (props: Partial<Parameters<typeof AttendanceCard>[0]> = {}) =>
  render(
    <NextIntlClientProvider
      locale="pt-BR"
      messages={messages}
      timeZone="America/Sao_Paulo"
      now={now}
    >
      <AttendanceCard
        groupId="g1"
        members={members}
        nextEvent={nextEvent}
        nudged={[]}
        confirmedNext={['u3']}
        viewerId="u1"
        now={now.toISOString()}
        {...props}
      />
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AttendanceCard', () => {
  it('tabela com presença, última partida e quem anda sumido em texto', () => {
    renderIt();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Presença nos últimos encontros')).toBeInTheDocument();
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Pessoa', 'Presença', 'Última partida']);
    const bia = within(table).getByRole('row', { name: /Bia/ });
    expect(bia).toHaveTextContent('1 de 8');
    expect(bia).toHaveTextContent('Sem aparecer há 6 semanas');
    expect(within(table).getByRole('row', { name: /Duda/ })).toHaveTextContent('Nunca jogou');
    expect(within(table).getByRole('row', { name: /Caio/ })).not.toHaveTextContent('Sem aparecer');
  });

  it('chama para o próximo uma vez e anuncia', async () => {
    const fetchMock = vi.fn(async () => Response.json({ nudged: true }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'Chamar Bia para o próximo encontro' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Aviso enviado para Bia.'),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/groups/g1/members/u2/nudge',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ eventId: 'e1' }) }),
    );
    const done = screen.getByRole('button', { name: 'Bia: chamado' });
    expect(done).toBeDisabled();
  });

  it('não oferece chamar quem já confirmou o próximo nem você mesmo', () => {
    renderIt();
    expect(screen.queryByRole('button', { name: /Chamar Caio/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Chamar Ana/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Chamar Duda/ })).toBeInTheDocument();
  });

  it('quem já foi chamado aparece como "Chamado"; sem próximo encontro não há botões', () => {
    renderIt({ nudged: ['u2'] });
    expect(screen.getByRole('row', { name: /Bia/ })).toHaveTextContent('Chamado');
    cleanup();
    renderIt({ nextEvent: null });
    expect(screen.queryByRole('button', { name: /Chamar/ })).toBeNull();
    expect(screen.getByText('Marque um encontro para poder chamar alguém.')).toBeInTheDocument();
  });
});
