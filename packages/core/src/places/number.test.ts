import { describe, expect, it, vi } from 'vitest';
import { fetchAddressSuggestions, houseNumberFrom, locateAddress, toSuggestion } from './index';

const feature = (properties: Record<string, unknown>, coordinates = [-51.17, -30.05]) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates },
});

describe('número da casa', () => {
  it('acha o número digitado, ignorando CEP', () => {
    expect(houseNumberFrom('Rua Padre Chagas 300')).toBe('300');
    expect(houseNumberFrom('Rua Padre Chagas, nº 300 - Moinhos')).toBe('300');
    expect(houseNumberFrom('Av. Ipiranga, 6681B, Porto Alegre')).toBe('6681B');
    expect(houseNumberFrom('Rua 25 de Março 1200')).toBe('1200');
    expect(houseNumberFrom('Rua A, 90619-900')).toBeNull();
    expect(houseNumberFrom('Rua Padre Chagas')).toBeNull();
  });

  it('põe o número no rótulo quando o mapa só tem a rua, e marca como aproximado', () => {
    const street = feature({ name: 'Rua Padre Chagas', type: 'street', city: 'Porto Alegre' });
    expect(toSuggestion(street, '300')).toEqual({
      label: 'Rua Padre Chagas, 300, Porto Alegre',
      name: null,
      lat: -30.05,
      lng: -51.17,
      approximate: true,
    });
    expect(toSuggestion(street)).toMatchObject({ label: 'Rua Padre Chagas, Porto Alegre' });
    expect(
      toSuggestion(feature({ street: 'Rua A', housenumber: '12', type: 'house' }), '300'),
    ).toMatchObject({ label: 'Rua A, 12' });
    expect(toSuggestion(feature({ name: 'Rua 25 de Março', type: 'street' }), '25')).toEqual(
      expect.not.objectContaining({ approximate: true }),
    );
  });

  it('lista primeiro os resultados com o número exato', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        features: [
          feature({ name: 'Rua A', type: 'street', city: 'Canoas' }),
          feature({ street: 'Rua A', housenumber: '300', city: 'Porto Alegre', type: 'house' }),
        ],
      }),
    );
    const results = await fetchAddressSuggestions('rua a 300', { fetch: fetchMock });
    expect(results.map((r) => r.label)).toEqual(['Rua A, 300, Porto Alegre', 'Rua A, 300, Canoas']);
    expect(results[1]!.approximate).toBe(true);
  });

  it('localiza o número no Nominatim, ou devolve null se ele não conhece o número', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json([{ lat: '-30.03', lon: '-51.2', address: { house_number: '300' } }]),
    );
    expect(
      await locateAddress('Rua Padre Chagas, 300, Porto Alegre', { fetch: fetchMock }),
    ).toEqual({ lat: -30.03, lng: -51.2 });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://nominatim.openstreetmap.org/search?q=Rua+Padre+Chagas%2C+300%2C+Porto+Alegre&format=jsonv2&addressdetails=1&limit=1',
    );
    const street = async () => Response.json([{ lat: '-30', lon: '-51', address: { road: 'X' } }]);
    expect(await locateAddress('Rua X, 300', { fetch: street })).toBeNull();
    expect(await locateAddress('Rua X', { fetch: fetchMock })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(
      locateAddress('Rua X, 300', { fetch: async () => new Response('x', { status: 429 }) }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });
});
