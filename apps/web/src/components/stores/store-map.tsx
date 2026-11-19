'use client';

import { DirectionsLinks } from '../places/directions';
import { LocationMap } from '../places/location-map';

/** Mapa e links de rota da loja (no perfil público). */
export function StoreMap({
  name,
  address,
  lat,
  lng,
  label,
}: {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <LocationMap label={label} points={[{ id: 'loja', name, lat, lng }]} />
      <DirectionsLinks place={{ name, address, lat, lng }} />
    </div>
  );
}
