// @vitest-environment jsdom
import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { NotificationList, type InboxEntry } from './notifications';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider
      locale="pt-BR"
      messages={messages}
      timeZone="America/Sao_Paulo"
      now={new Date('2026-11-18T12:00:00Z')}
    >
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );

const base = {
  groupName: 'Mesa de Quinta',
  eventTitle: 'Noite',
  people: { b: 'Bia', c: 'Caio' },
  announcement: null,
};
const items: InboxEntry[] = [
  {
    ...base,
    id: '1',
    kind: 'game',
    createdAt: '2026-11-18T11:00:00Z',
    readAt: null,
    data: { kind: 'game', gameId: 'g', eventId: 'e1', result: 'loss', winnerIds: ['b'] },
  },
  {
    ...base,
    id: '2',
    kind: 'group_game',
    createdAt: '2026-11-17T12:00:00Z',
    readAt: '2026-11-17T13:00:00Z',
    data: { kind: 'group_game', gameId: 'g2', eventId: 'e2', winnerIds: ['b', 'c'] },
  },
  {
    ...base,
    id: '3',
    kind: 'podium',
    createdAt: '2026-11-16T12:00:00Z',
    readAt: '2026-11-17T13:00:00Z',
    data: { kind: 'podium', userIds: ['c', 'b', 'x'] },
  },
  {
    ...base,
    id: '5',
    kind: 'nudge',
    createdAt: '2026-11-15T10:00:00Z',
    readAt: '2026-11-17T13:00:00Z',
    data: { kind: 'nudge', eventId: 'e9' },
  },
  {
    ...base,
    id: '4',
    kind: 'announcement',
    groupName: null,
    createdAt: '2026-11-15T12:00:00Z',
    readAt: '2026-11-17T13:00:00Z',
    announcement: { title: 'Manutenção no sábado', body: 'Das 8h às 8h10.\nVolta logo!' },
    data: { kind: 'announcement', announcementId: 'a1' },
  },
];

describe('NotificationList', () => {
  it('texto no idioma de quem lê, link para o encontro, "Nova" e marca como lidas', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = wrap(<NotificationList items={items} />);
    expect(
      screen.getByRole('link', { name: /Partida registrada em Noite: Bia venceu\./ }),
    ).toHaveAttribute('href', '/eventos/e1');
    expect(screen.getByText('Bia e Caio venceram uma partida em Noite.')).toBeInTheDocument();
    // Quem não é mais conhecido (conta excluída) vira "alguém".
    expect(
      screen.getByText('O pódio de Mesa de Quinta mudou: 1º Caio, 2º Bia, 3º alguém.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Nova')).toHaveLength(1);
    expect(
      screen.getByRole('link', {
        name: /Mesa de Quinta chamou você para o próximo encontro: Noite\./,
      }),
    ).toHaveAttribute('href', '/eventos/e9');
    // Aviso do ArcanaKin: título e texto, sem link.
    expect(screen.getByText('Manutenção no sábado')).toBeInTheDocument();
    expect(screen.getByText(/Das 8h às 8h10\./)).toBeInTheDocument();
    expect(screen.getByText('há 1 hora')).toBeInTheDocument();
    // Abrir a central não marca nada sozinho.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('1 não lida.');
    const results = await axe.run(container, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations.map((v) => v.id)).toEqual([]);

    // Marcar uma como lida: chama a rota dela, some o "Nova" e o botão, e o sino atualiza.
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Marcar como lida: Partida registrada em Noite: Bia venceu.',
        }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/notifications/1/read',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.queryByText('Nova')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Marcar como lida/ })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Tudo lido.');
    expect(refresh).toHaveBeenCalled();
  });

  it('"Marcar todas como lidas" marca tudo de uma vez', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    wrap(<NotificationList items={items.map((i) => ({ ...i, readAt: null }))} />);
    expect(screen.getAllByText('Nova')).toHaveLength(5);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/notifications/read',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.queryByText('Nova')).toBeNull();
  });

  it('sem notificações: explica o que vai aparecer, sem chamar a API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    wrap(<NotificationList items={[]} />);
    expect(screen.getByText(/Nada por aqui ainda/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
