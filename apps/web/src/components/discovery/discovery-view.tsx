'use client';

import { googleCalendarUrl } from '@boramarcar/core/calendar';
import { isGameFormat, type GameFormat } from '@boramarcar/core';
import { roundCoord, STORE_OFFERS, type StoreOffer } from '@boramarcar/core/discovery';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { CITY_COOKIE } from '@/lib/discovery';
import { Icon } from '../icons';
import { CityPicker, type CityOption } from '../places/city-picker';

export interface DiscoveryEvent {
  id: string;
  title: string;
  startsAt: string;
  format: string;
  kind: string;
  capacity: number | null;
  registered: number;
  waitlist: number;
  distanceKm: number;
  store: { name: string; slug: string; municipality: { name: string; uf: string } };
}
export interface DiscoveryStore {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  offers: string[];
  distanceKm: number;
  municipality: { name: string; uf: string; slug: string };
  nextEvent: { id: string; title: string; startsAt: string } | null;
}
export interface DiscoveryData {
  events: DiscoveryEvent[];
  stores: DiscoveryStore[];
}

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/**
 * Lojas e eventos por perto (10.3): cidade (com a lista do IBGE), "Usar minha localização"
 * (só ao tocar; a posição vai arredondada e não é guardada) e filtros de formato, tipo e o que a
 * loja oferece.
 */
export function DiscoveryView({
  city,
  data,
  nearest = [],
}: {
  city: CityOption | null;
  /** `null` = ainda sem cidade (só a escolha aparece). */
  data: DiscoveryData | null;
  /** Cidades com loja mais perto, para quando não há loja no raio. */
  nearest?: { name: string; uf: string; slug: string }[];
}) {
  const t = useTranslations('discovery');
  const ts = useTranslations('stores');
  const tf = useTranslations('formats');
  const tc = useTranslations('common');
  const format = useFormatter();
  const router = useRouter();
  const [shown, setShown] = useState<DiscoveryData | null>(data);
  const [formats, setFormats] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [offers, setOffers] = useState<StoreOffer[]>([]);
  const [status, setStatus] = useState('');

  const chooseCity = (c: CityOption) => {
    const value = `${c.uf.toLowerCase()}/${c.slug}`;
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
    setStatus('');
    router.push(`/lojas?cidade=${encodeURIComponent(value)}`);
  };

  const useLocation = () => {
    if (!('geolocation' in navigator)) return setStatus(t('locationError'));
    setStatus(t('locating'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const found = await api<DiscoveryData>(
            `/api/v1/discovery?lat=${roundCoord(pos.coords.latitude)}&lng=${roundCoord(pos.coords.longitude)}`,
          );
          setShown(found);
          setStatus(t('located'));
        } catch {
          setStatus(t('locationError'));
        }
      },
      () => setStatus(t('locationError')),
      { maximumAge: 600_000, timeout: 15_000 },
    );
  };

  const formatsHere = [...new Set((shown?.events ?? []).map((e) => e.format))].filter(isGameFormat);
  const events = (shown?.events ?? []).filter(
    (e) =>
      (!formats.length || formats.includes(e.format)) && (!kinds.length || kinds.includes(e.kind)),
  );
  const stores = (shown?.stores ?? []).filter((s) => offers.every((o) => s.offers.includes(o)));
  const when = (iso: string) =>
    format.dateTime(new Date(iso), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const chip = (pressed: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${pressed ? 'border-primary bg-surface-muted font-semibold' : 'border-line-strong'}`;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <CityPicker label={t('cityLabel')} value={city} onChange={chooseCity} />
        </div>
        <button type="button" className="btn-secondary" onClick={useLocation}>
          <Icon name="location" />
          {t('useLocation')}
        </button>
        <p role="status" className="w-full text-sm">
          {status}
        </p>
      </div>

      {shown && (
        <>
          <section className="card space-y-4" aria-labelledby="descoberta-eventos">
            <h2 id="descoberta-eventos" className="section-title mb-0">
              {t('events')}
            </h2>
            {formatsHere.length > 1 && (
              <div role="group" aria-label={t('filterFormat')} className="flex flex-wrap gap-2">
                {formatsHere.map((f: GameFormat) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={formats.includes(f)}
                    className={chip(formats.includes(f))}
                    onClick={() => setFormats((v) => toggle(v, f))}
                  >
                    {tf(f)}
                  </button>
                ))}
              </div>
            )}
            <div role="group" aria-label={t('filterKind')} className="flex flex-wrap gap-2">
              {(['tournament', 'casual'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kinds.includes(k)}
                  className={chip(kinds.includes(k))}
                  onClick={() => setKinds((v) => toggle(v, k))}
                >
                  {t(`kinds.${k}`)}
                </button>
              ))}
            </div>
            {events.length === 0 ? (
              <p className="muted">{t('noEvents')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {events.map((e) => {
                  const href = `/lojas/${e.store.slug}/eventos/${e.id}`;
                  return (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{when(e.startsAt)}</p>
                        <Link
                          href={href}
                          className="font-semibold underline-offset-2 hover:underline"
                        >
                          {e.title}
                        </Link>
                        <p className="muted text-sm">
                          {e.store.name} · {e.store.municipality.name} ·{' '}
                          {t('distance', { km: format.number(e.distanceKm) })} ·{' '}
                          {isGameFormat(e.format) ? tf(e.format) : e.format} ·{' '}
                          {t(`kinds.${e.kind as 'casual'}`)}
                        </p>
                        <p className="text-sm">
                          {e.capacity
                            ? t('spots', { registered: e.registered, capacity: e.capacity })
                            : t('spotsOpen', { registered: e.registered })}
                          {e.waitlist > 0 ? ` · ${t('waitlist', { count: e.waitlist })}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          className="btn-secondary"
                          href={`/api/v1/store-events/${e.id}/ics`}
                          download
                        >
                          <Icon name="addToCalendar" />
                          {t('ics')}
                          <span className="sr-only"> ({e.title})</span>
                        </a>
                        <a
                          className="btn-secondary"
                          target="_blank"
                          rel="noreferrer"
                          href={googleCalendarUrl({
                            uid: e.id,
                            title: `${e.title} · ${e.store.name}`,
                            start: new Date(e.startsAt),
                            location: e.store.name,
                          })}
                        >
                          {t('google')}
                          <span className="sr-only">
                            {' '}
                            ({e.title}) {tc('newTab')}
                          </span>
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card space-y-4" aria-labelledby="descoberta-lojas">
            <h2 id="descoberta-lojas" className="section-title mb-0">
              {t('stores')}
            </h2>
            <div role="group" aria-label={t('filterOffers')} className="flex flex-wrap gap-2">
              {STORE_OFFERS.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={offers.includes(o)}
                  className={chip(offers.includes(o))}
                  onClick={() => setOffers((v) => toggle(v, o))}
                >
                  {ts(`offers.${o}`)}
                </button>
              ))}
            </div>
            {stores.length === 0 ? (
              <div className="space-y-2">
                <p className="muted">{t('noStores', { city: city?.name ?? '' })}</p>
                {nearest.length > 0 && (
                  <>
                    <p>{t('nearestCities')}</p>
                    <ul className="flex flex-wrap gap-2">
                      {nearest.map((c) => (
                        <li key={`${c.uf}-${c.slug}`}>
                          <Link
                            href={`/lojas/em/${c.uf.toLowerCase()}/${c.slug}`}
                            className="btn-secondary"
                          >
                            {c.name}, {c.uf}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {stores.map((s) => (
                  <li key={s.id} className="space-y-1 rounded-xl border border-line p-4">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lojas/${s.slug}`}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {s.name}
                      </Link>
                      {s.verified && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                          {t('verified')}
                        </span>
                      )}
                    </p>
                    <p className="muted text-sm">
                      {s.municipality.name}, {s.municipality.uf} ·{' '}
                      {t('distance', { km: format.number(s.distanceKm) })}
                    </p>
                    {s.offers.length > 0 && (
                      <p className="text-sm">
                        {s.offers
                          .filter((o): o is StoreOffer =>
                            (STORE_OFFERS as readonly string[]).includes(o),
                          )
                          .map((o) => ts(`offers.${o}`))
                          .join(' · ')}
                      </p>
                    )}
                    {s.nextEvent && (
                      <p className="text-sm">
                        {t('next', { title: s.nextEvent.title, date: when(s.nextEvent.startsAt) })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
