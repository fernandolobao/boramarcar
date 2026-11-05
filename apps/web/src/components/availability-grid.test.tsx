// @vitest-environment jsdom
import { buildWeekGrid } from '@boramarcar/core/availability';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { AvailabilityGrid } from './availability-grid';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const grid = buildWeekGrid({
  weekStart: '2026-11-09',
  timeZone: 'America/Sao_Paulo',
  currentUserId: 'a',
  hours: [19, 20],
  slots: [
    {
      userId: 'b',
      start: new Date('2026-11-12T22:00:00Z'),
      end: new Date('2026-11-13T00:00:00Z'),
      kind: 'once',
    },
    {
      userId: 'a',
      start: new Date('2026-11-13T22:00:00Z'),
      end: new Date('2026-11-13T23:00:00Z'),
      kind: 'weekly',
    },
  ],
});

const renderGrid = () =>
  render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <AvailabilityGrid
        groupId="g1"
        grid={grid}
        members={[
          { userId: 'a', name: 'Ana' },
          { userId: 'b', name: 'Bia' },
        ]}
        minPlayers={4}
      />
    </NextIntlClientProvider>,
  );

describe('AvailabilityGrid', () => {
  it('tem uma única parada de Tab e navega pelas setas', () => {
    renderGrid();
    const cells = screen.getAllByRole('button');
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    cells[0]!.focus();
    fireEvent.keyDown(cells[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]);
    fireEvent.keyDown(cells[1]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[8]); // segunda linha, terça
    fireEvent.keyDown(cells[8]!, { key: 'End' });
    expect(document.activeElement).toBe(cells[13]);
    fireEvent.keyDown(cells[13]!, { key: 'PageUp' });
    expect(document.activeElement).toBe(cells[6]);
  });

  it('descreve cada célula e marca o horário do usuário', async () => {
    const fetchMock = vi.fn(async () => Response.json({ available: true }));
    vi.stubGlobal('fetch', fetchMock);
    renderGrid();
    const cell = screen.getByRole('button', {
      name: /quinta-feira, 12 de novembro, 19h: 1 pessoa disponível \(Bia\)\. Você não está disponível/,
    });
    expect(cell).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(cell);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/groups/g1/availability/range');
    expect(JSON.parse(String(init.body))).toEqual({
      start: '2026-11-12T22:00:00.000Z',
      end: '2026-11-12T23:00:00.000Z',
      available: true,
    });
  });

  it('células de regra semanal não são alteradas pela grade', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderGrid();
    const weekly = screen.getByRole('button', {
      name: /sexta-feira, 13 de novembro, 19h.*regra semanal/,
    });
    expect(weekly).toHaveAttribute('aria-disabled', 'true');
    expect(weekly).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(weekly);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
