import { directionsLinks, type Place } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { Icon } from '../icons';

/** Links para abrir o local nos apps de mapa (Google Maps, Apple Maps, Waze, OpenStreetMap). */
export function DirectionsLinks({ place }: { place: Place & { name: string } }) {
  const t = useTranslations('places');
  const tc = useTranslations('common');
  const links = directionsLinks(place);
  if (!links) return null;
  const apps = [
    ['google', 'Google Maps'],
    ['apple', 'Apple Maps'],
    ['waze', 'Waze'],
    ['osm', 'OpenStreetMap'],
  ] as const;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t('directionsTo', { name: place.name })}>
      {apps.map(([key, label]) => (
        <li key={key}>
          <a
            href={links[key]}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            <Icon name="directions" className="size-4 shrink-0" />
            {label}
            <span className="sr-only">
              {' '}
              ({t('routeTo', { name: place.name })}) {tc('newTab')}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
