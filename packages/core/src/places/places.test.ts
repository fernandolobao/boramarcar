import { describe, expect, it, vi } from 'vitest';
import { directionsLinks, fetchAddressSuggestions, toSuggestion, validCoordinates } from './index';

const feature = (properties: Record<string, unknown>, coordinates = [-51.17, -30.05]) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates },
});

describe('endereços (Photon)', () => {
  it('monta o rótulo com lugar, rua e número, bairro, cidade e estado', () => {
    expect(
      toSuggestion(
        feature({
          name: 'PUCRS',
          street: 'Avenida Ipiranga',
          housenumber: '6681',
          district: 'Partenon',
          city: 'Porto Alegre',
          state: 'Rio Grande do Sul',
        }),
      ),
    ).toEqual({
      label: 'PUCRS, Avenida Ipiranga, 6681, Partenon, Porto Alegre, Rio Grande do Sul',
      name: 'PUCRS',
      lat: -30.05,
      lng: -51.17,
    });
    expect(toSuggestion(feature({ name: 'Rua X', street: 'Rua X', city: 'Canoas' }))).toMatchObject(
      {
        label: 'Rua X, Canoas',
        name: null,
      },
    );
    expect(toSuggestion(feature({}))).toBeNull();
    expect(toSuggestion({ nada: 1 })).toBeNull();
  });

  it('busca com viés de localização, sem repetidos, e ignora textos curtos', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({
        features: [
          feature({ street: 'Rua A', city: 'Porto Alegre' }),
          feature({ street: 'Rua A', city: 'Porto Alegre' }, [-51, -30]),
          { quebrado: true },
        ],
      }),
    );
    const results = await fetchAddressSuggestions('rua a', {
      fetch: fetchMock,
      near: { lat: -30, lng: -51.2 },
    });
    expect(results).toHaveLength(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://photon.komoot.io/api/?q=rua+a&limit=6&lat=-30&lon=-51.2',
    );
    expect(await fetchAddressSuggestions('ru', { fetch: fetchMock })).toEqual([]);
    await expect(
      fetchAddressSuggestions('rua a', { fetch: async () => new Response('x', { status: 503 }) }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });
});

describe('links de rota', () => {
  it('usam as coordenadas quando existem; senão, o endereço', () => {
    expect(
      directionsLinks({ name: 'Casa da Ana', address: 'Rua A, 1', lat: -30.05, lng: -51.17 }),
    ).toEqual({
      google: 'https://www.google.com/maps/dir/?api=1&destination=-30.05,-51.17',
      apple: 'https://maps.apple.com/?daddr=-30.05,-51.17&q=Rua%20A%2C%201',
      waze: 'https://waze.com/ul?ll=-30.05,-51.17&navigate=yes',
      osm: 'https://www.openstreetmap.org/?mlat=-30.05&mlon=-51.17#map=17/-30.05/-51.17',
    });
    expect(directionsLinks({ name: 'Loja', address: null })?.google).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Loja',
    );
    expect(directionsLinks({ name: ' ', address: '' })).toBeNull();
  });

  it('valida coordenadas', () => {
    expect(validCoordinates(null, null)).toBe(true);
    expect(validCoordinates(-30, -51)).toBe(true);
    expect(validCoordinates(-91, 0)).toBe(false);
    expect(validCoordinates(1, null)).toBe(false);
    expect(validCoordinates(Number.NaN, 1)).toBe(false);
  });
});
