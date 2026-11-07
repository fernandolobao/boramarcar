// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/pt-BR.json';
import { LocationForm } from './location-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./location-map', () => ({
  LocationMap: ({ label, points }: { label: string; points: { lat: number }[] }) => (
    <div role="region" aria-label={label} data-points={points.length} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LocationForm', () => {
  it('sugere endereços, marca o ponto e envia o local', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.startsWith('/api/v1/places')) {
          return Response.json({
            suggestions: [
              {
                label: 'PUCRS, Avenida Ipiranga, 6681, Porto Alegre',
                name: 'PUCRS',
                lat: -30.05,
                lng: -51.17,
              },
            ],
          });
        }
        return Response.json({ location: { id: 'l1' } }, { status: 201 });
      }),
    );
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <LocationForm
          groupId="g1"
          members={[{ userId: 'u1', name: 'Ana' }]}
          near={{ lat: -30, lng: -51 }}
        />
      </NextIntlClientProvider>,
    );
    const address = screen.getByRole('combobox', { name: 'Endereço' });
    fireEvent.change(address, { target: { value: 'ipiranga 6681' } });
    const option = await screen.findByRole('option', { name: /PUCRS/ }, { timeout: 2000 });
    expect(calls[0]!.url).toBe('/api/v1/places?q=ipiranga+6681&lat=-30&lng=-51');
    fireEvent.mouseDown(option);
    expect(address).toHaveValue('PUCRS, Avenida Ipiranga, 6681, Porto Alegre');
    expect(screen.getByLabelText('Nome do local')).toHaveValue('PUCRS');
    expect(screen.getByRole('region', { name: 'Mapa: PUCRS' })).toHaveAttribute('data-points', '1');

    fireEvent.change(screen.getByLabelText(/Anfitrião/), { target: { value: 'u1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar local' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.url).toBe('/api/v1/groups/g1/locations');
    expect(JSON.parse(String(calls[1]!.init!.body))).toEqual({
      name: 'PUCRS',
      address: 'PUCRS, Avenida Ipiranga, 6681, Porto Alegre',
      details: null,
      hostUserId: 'u1',
      lat: -30.05,
      lng: -51.17,
    });
    expect(await screen.findByText('PUCRS salvo.')).toBeInTheDocument();

    // "Remover pino" some quando não há ponto (formulário limpo depois de salvar).
    expect(screen.queryByRole('button', { name: 'Remover pino do mapa' })).toBeNull();
  });

  it('com o número que o mapa só conhece pela rua, procura o número e move o pino', async () => {
    const urls: string[] = [];
    let found = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(url);
        if (url.startsWith('/api/v1/places/locate')) {
          return Response.json({ point: found ? { lat: -30.03, lng: -51.2 } : null });
        }
        if (url.startsWith('/api/v1/places')) {
          return Response.json({
            suggestions: [
              {
                label: 'Rua Padre Chagas, 300, Porto Alegre',
                name: null,
                lat: -30.02,
                lng: -51.19,
                approximate: true,
              },
            ],
          });
        }
        return Response.json({ body: init?.body ?? null }, { status: 201 });
      }),
    );
    render(
      <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
        <LocationForm groupId="g1" members={[]} />
      </NextIntlClientProvider>,
    );
    const address = screen.getByRole('combobox', { name: 'Endereço' });
    const pick = async (value: string) => {
      fireEvent.change(address, { target: { value } });
      fireEvent.mouseDown(
        await screen.findByRole('option', { name: /Padre Chagas/ }, { timeout: 2000 }),
      );
    };
    await pick('padre chagas 300');
    expect(address).toHaveValue('Rua Padre Chagas, 300, Porto Alegre');
    expect(
      await screen.findByText('Número encontrado: o pino está no endereço.'),
    ).toBeInTheDocument();
    expect(urls).toContain('/api/v1/places/locate?q=Rua+Padre+Chagas%2C+300%2C+Porto+Alegre');

    fireEvent.change(screen.getByLabelText('Nome do local'), { target: { value: 'Casa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar local' }));
    await waitFor(() => expect(urls.at(-1)).toBe('/api/v1/groups/g1/locations'));
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)![1]!.body));
    expect(body).toMatchObject({
      address: 'Rua Padre Chagas, 300, Porto Alegre',
      lat: -30.03,
      lng: -51.2,
    });

    found = false;
    await pick('padre chagas 300 b');
    expect(await screen.findByText(/ainda não tem esse número/)).toBeInTheDocument();
  });
});
