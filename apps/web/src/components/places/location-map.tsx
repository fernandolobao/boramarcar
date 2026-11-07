'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Pino em CSS (evita as imagens padrão do Leaflet, que se perdem no bundle). */
const pinHtml = (label: string) =>
  `<span class="bm-pin" aria-hidden="true"></span><span class="bm-pin-label">${label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</span>`;

/**
 * Mapa do OpenStreetMap (Leaflet + tiles do OSM, com o crédito exigido). É complementar: o
 * endereço e os links de rota ficam sempre em texto. Com `onPick`, clicar no mapa ou arrastar o
 * pino ajusta as coordenadas.
 */
export function LocationMap({
  points,
  label,
  className = 'h-64',
  onPick,
}: {
  points: readonly MapPoint[];
  label: string;
  className?: string;
  onPick?: (point: { lat: number; lng: number }) => void;
}) {
  const t = useTranslations('places');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);
  const zoomTitles = useRef({ zoomInTitle: t('zoomIn'), zoomOutTitle: t('zoomOut') });
  const editable = Boolean(onPick);
  const key = points.map((p) => `${p.id}:${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      if (!map.current) {
        map.current = L.map(container.current, {
          scrollWheelZoom: false,
          attributionControl: true,
          zoomControl: false,
        });
        L.control.zoom(zoomTitles.current).addTo(map.current);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map.current);
        map.current.attributionControl.setPrefix(false);
        map.current.on('click', (e) => pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      }
      const m = map.current;
      for (const marker of markers.current) marker.remove();
      markers.current = points.map((p) => {
        const marker = L.marker([p.lat, p.lng], {
          draggable: editable,
          keyboard: false,
          icon: L.divIcon({ className: 'bm-marker', html: pinHtml(p.name), iconSize: [0, 0] }),
        }).addTo(m);
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          pickRef.current?.({ lat: ll.lat, lng: ll.lng });
        });
        return marker;
      });
      if (points.length === 1) m.setView([points[0]!.lat, points[0]!.lng], 16);
      else if (points.length > 1) {
        m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
      } else m.setView([-14.2, -51.9], 3); // Brasil
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, editable]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      title={onPick ? t('mapPickHint') : undefined}
      className={`z-0 w-full overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 ${className}`}
    />
  );
}
