import { z } from 'zod';
import { DomainError } from '../errors';
import type { FetchLike } from '../decks/types';

/**
 * Endereços e mapas (2.14) com dados do OpenStreetMap: autocompletar pelo Photon (Komoot), que
 * permite busca enquanto se digita (o Nominatim não permite), e links de rota para os apps.
 */
export const PHOTON_API = 'https://photon.komoot.io';

export interface AddressSuggestion {
  /** Texto para mostrar e guardar como endereço. */
  label: string;
  /** Nome do lugar, quando é um ponto conhecido (ex.: "PUCRS"). */
  name: string | null;
  lat: number;
  lng: number;
}

const featureSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z
    .object({
      name: z.string().optional(),
      street: z.string().optional(),
      housenumber: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
    })
    .loose(),
});
const photonSchema = z.object({ features: z.array(z.unknown()) });

/** Converte um resultado do Photon em sugestão ("Avenida Ipiranga, 6681 - Partenon, Porto Alegre - RS"). */
export function toSuggestion(feature: unknown): AddressSuggestion | null {
  const parsed = featureSchema.safeParse(feature);
  if (!parsed.success) return null;
  const p = parsed.data.properties;
  const [lng, lat] = parsed.data.geometry.coordinates;
  const street = p.street ? [p.street, p.housenumber].filter(Boolean).join(', ') : null;
  const place = p.name && p.name !== p.street ? p.name : null;
  const parts = [place, street, p.district, p.city, p.state].filter(
    (part, i, all): part is string => Boolean(part) && all.indexOf(part) === i,
  );
  if (!parts.length) return null;
  return { label: parts.join(', '), name: place, lat, lng };
}

/** Sugestões de endereço (até `limit`), opcionalmente perto de um ponto. Menos de 3 letras: nada. */
export async function fetchAddressSuggestions(
  query: string,
  options: {
    fetch: FetchLike;
    near?: { lat: number; lng: number };
    limit?: number;
    userAgent?: string;
  },
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, limit: String(options.limit ?? 6) });
  if (options.near) {
    params.set('lat', String(options.near.lat));
    params.set('lon', String(options.near.lng));
  }
  const response = await options.fetch(`${PHOTON_API}/api/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        options.userAgent ?? 'BoraMarcar/1.0 (+https://github.com/fernandolobao/boramarcar)',
    },
  });
  if (!response.ok) {
    throw new DomainError('upstream_error', `Busca de endereços respondeu ${response.status}`);
  }
  const parsed = photonSchema.safeParse(await response.json());
  if (!parsed.success) throw new DomainError('upstream_error', 'Resposta inesperada da busca');
  const seen = new Set<string>();
  return parsed.data.features
    .map(toSuggestion)
    .filter((s): s is AddressSuggestion => s !== null)
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)));
}

export interface Place {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const hasPoint = (p: Place): p is Place & { lat: number; lng: number } =>
  typeof p.lat === 'number' && typeof p.lng === 'number';

/** Links para abrir o local e traçar a rota nos apps de mapa (coordenadas ou, sem elas, endereço). */
export function directionsLinks(place: Place) {
  const text = [place.address, place.name].find((v) => v?.trim()) ?? null;
  if (!hasPoint(place) && !text) return null;
  const q = encodeURIComponent(text ?? '');
  if (hasPoint(place)) {
    const ll = `${place.lat},${place.lng}`;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${ll}`,
      apple: `https://maps.apple.com/?daddr=${ll}${text ? `&q=${q}` : ''}`,
      waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
      osm: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`,
    };
  }
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    osm: `https://www.openstreetmap.org/search?query=${q}`,
  };
}

/** Coordenadas válidas (ou ambas ausentes). */
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  if (lat == null && lng == null) return true;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
