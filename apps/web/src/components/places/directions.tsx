'use client';

import { directionsLinks, type Place } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Icon } from '../icons';

/**
 * Links para abrir o local nos apps de mapa (Google Maps, Apple Maps, Waze, OpenStreetMap).
 * `collapsible`: numa lista de vários locais, um botão "Como chegar" abre os quatro (no celular,
 * quatro botões por local ocupavam a tela).
 */
export function DirectionsLinks({
  place,
  collapsible = false,
}: {
  place: Place & { name: string };
  collapsible?: boolean;
}) {
  const t = useTranslations('places');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const id = useId();
  const links = directionsLinks(place);
  if (!links) return null;
  const apps = [
    ['google', 'Google Maps'],
    ['apple', 'Apple Maps'],
    ['waze', 'Waze'],
    ['osm', 'OpenStreetMap'],
  ] as const;
  const list = (
    <ul
      id={id}
      hidden={collapsible && !open}
      className={`flex flex-wrap gap-2 ${collapsible ? 'order-last basis-full' : ''}`}
      aria-label={t('directionsTo', { name: place.name })}
    >
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
  if (!collapsible) return list;
  return (
    <>
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="directions" className="size-4 shrink-0" />
        {t('howToGet')}
        <span className="sr-only"> ({place.name})</span>
        <Icon
          name="chevronDown"
          className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {list}
    </>
  );
}
