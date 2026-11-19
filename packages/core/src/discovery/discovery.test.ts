import { describe, expect, it } from 'vitest';
import { RESERVED_STORE_SLUGS } from '../stores';
import {
  boundingBox,
  distanceKm,
  isStoreOffer,
  municipalitySlug,
  roundCoord,
  validCoords,
} from './index';

const curitiba = { lat: -25.4284, lng: -49.2733 };
const sjp = { lat: -25.5302, lng: -49.2064 };

describe('descoberta: regras puras (10.3)', () => {
  it('distância entre cidades (haversine)', () => {
    const d = distanceKm(curitiba, sjp);
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(14);
    expect(distanceKm(curitiba, curitiba)).toBe(0);
  });

  it('caixa de busca contém o que está a 49 km e não o que está a 60 km', () => {
    const box = boundingBox(curitiba, 50);
    const east = (km: number) => ({
      lat: curitiba.lat,
      lng: curitiba.lng + km / (111.32 * Math.cos((curitiba.lat * Math.PI) / 180)),
    });
    const inside = (p: { lat: number; lng: number }) =>
      p.lat >= box.minLat && p.lat <= box.maxLat && p.lng >= box.minLng && p.lng <= box.maxLng;
    expect(inside(east(49))).toBe(true);
    expect(inside(east(60))).toBe(false);
  });

  it('posição arredondada e validada', () => {
    expect(roundCoord(-25.42841)).toBe(-25.43);
    expect(validCoords(91, 0)).toBeNull();
    expect(validCoords(0, 181)).toBeNull();
    expect(validCoords(Number.NaN, 0)).toBeNull();
    expect(validCoords('x', 0)).toBeNull();
    expect(validCoords('-25.4', '-49.2')).toEqual({ lat: -25.4, lng: -49.2 });
  });

  it('slug da cidade e ofertas da loja', () => {
    expect(municipalitySlug("Santa Bárbara d'Oeste")).toBe('santa-barbara-d-oeste');
    expect(municipalitySlug('São José dos Pinhais')).toBe('sao-jose-dos-pinhais');
    expect(isStoreOffer('sealed')).toBe(true);
    expect(isStoreOffer('cafe')).toBe(false);
    expect(RESERVED_STORE_SLUGS).toContain('em');
  });
});
