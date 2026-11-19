/**
 * Descoberta de lojas e eventos por perto (10.3; desenho em
 * `docs/superpowers/specs/2026-11-19-descoberta-lojas-design.md`). Tudo aqui é puro.
 */

/** "Perto" = até 50 km do centro da cidade (ou da posição do aparelho). */
export const DISCOVERY_RADIUS_KM = 50;
/** Eventos dos próximos 30 dias. */
export const DISCOVERY_DAYS = 30;

/** O que a loja oferece (filtro da descoberta). */
export const STORE_OFFERS = ['singles', 'sealed', 'play_space', 'tournaments'] as const;
export type StoreOffer = (typeof STORE_OFFERS)[number];
export const isStoreOffer = (value: string): value is StoreOffer =>
  (STORE_OFFERS as readonly string[]).includes(value);

export interface Point {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta entre dois pontos (haversine), em km. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Retângulo que contém o círculo (filtro barato antes de calcular a distância exata). */
export function boundingBox(center: Point, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos(rad(center.lat))));
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  };
}

/** Posição do aparelho com 2 casas (~1 km): o suficiente para ordenar, sem expor o endereço. */
export const roundCoord = (value: number) => Math.round(value * 100) / 100;

/** Coordenadas válidas (números dentro dos limites) ou `null`. */
export function validCoords(lat: unknown, lng: unknown): Point | null {
  const la = typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : lat;
  const ln = typeof lng === 'string' && lng.trim() !== '' ? Number(lng) : lng;
  if (typeof la !== 'number' || typeof ln !== 'number') return null;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}

/** Nome da cidade no endereço (`São José dos Pinhais` → `sao-jose-dos-pinhais`). */
export function municipalitySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
