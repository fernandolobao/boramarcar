'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';
import { AddressSearch } from './address-search';
import { LocationMap } from './location-map';

export interface LocationView {
  id: string;
  name: string;
  address: string | null;
  details: string | null;
  lat: number | null;
  lng: number | null;
  hostUserId: string | null;
  hostName: string | null;
  createdBy: string | null;
}

/** Cadastrar ou editar um local: nome, endereço com autocompletar, complemento, anfitrião e pino. */
export function LocationForm({
  groupId,
  members,
  location,
  near,
  onDone,
}: {
  groupId: string;
  members: readonly { userId: string; name: string }[];
  location?: LocationView;
  near?: { lat: number; lng: number } | null;
  onDone?: () => void;
}) {
  const t = useTranslations('places');
  const tc = useTranslations('common');
  const id = useId();
  const { run, error, pending } = useApiAction();
  const empty = { name: '', address: '', details: '', hostUserId: '', lat: null, lng: null };
  const initial = location
    ? {
        name: location.name,
        address: location.address ?? '',
        details: location.details ?? '',
        hostUserId: location.hostUserId ?? '',
        lat: location.lat,
        lng: location.lng,
      }
    : empty;
  const [values, setValues] = useState<{
    name: string;
    address: string;
    details: string;
    hostUserId: string;
    lat: number | null;
    lng: number | null;
  }>(initial);
  const [saved, setSaved] = useState('');
  /** Situação do pino depois de escolher um endereço com número que o mapa só conhece pela rua. */
  const [precision, setPrecision] = useState<'idle' | 'locating' | 'exact' | 'street'>('idle');
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const point =
    values.lat !== null && values.lng !== null
      ? { id: 'pin', name: values.name || t('newLocation'), lat: values.lat, lng: values.lng }
      : null;

  return (
    <form
      className="space-y-4"
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        setSaved('');
        const body = {
          name: values.name,
          address: values.address || null,
          details: values.details || null,
          hostUserId: values.hostUserId || null,
          lat: values.lat,
          lng: values.lng,
        };
        void run(
          () =>
            location
              ? api(`/api/v1/groups/${groupId}/locations/${location.id}`, {
                  method: 'PATCH',
                  body,
                })
              : api(`/api/v1/groups/${groupId}/locations`, { method: 'POST', body }),
          () => {
            setSaved(t('saved', { name: values.name }));
            if (!location) setValues(empty);
            onDone?.();
          },
        );
      }}
    >
      <h3 id={`${id}-title`} className="font-semibold">
        {location ? t('editTitle', { name: location.name }) : t('addTitle')}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${id}-name`}>
            {t('name')}
          </label>
          <input
            id={`${id}-name`}
            className="input"
            required
            maxLength={80}
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-host`}>
            {t('host')} <span className="muted">({tc('optional')})</span>
          </label>
          <select
            id={`${id}-host`}
            className="select"
            value={values.hostUserId}
            onChange={(e) => set({ hostUserId: e.target.value })}
          >
            <option value="">{t('noHost')}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <AddressSearch
            id={`${id}-address`}
            label={t('address')}
            value={values.address}
            near={near}
            onChange={(address) => set({ address })}
            onPick={(s) => {
              set({
                address: s.label,
                lat: s.lat,
                lng: s.lng,
                name: values.name || s.name || values.name,
              });
              if (!s.approximate) return setPrecision('idle');
              // Só a rua no autocompletar: tenta achar o número exato (uma busca, no Nominatim).
              setPrecision('locating');
              void api<{ point: { lat: number; lng: number } | null }>(
                `/api/v1/places/locate?${new URLSearchParams({ q: s.label })}`,
              )
                .then(({ point }) => {
                  setValues((v) => (v.address === s.label && point ? { ...v, ...point } : v));
                  setPrecision(point ? 'exact' : 'street');
                })
                .catch(() => setPrecision('street'));
            }}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor={`${id}-details`}>
            {t('details')} <span className="muted">({tc('optional')})</span>
          </label>
          <input
            id={`${id}-details`}
            className="input"
            maxLength={300}
            placeholder={t('detailsPlaceholder')}
            value={values.details}
            onChange={(e) => set({ details: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="muted text-sm" id={`${id}-map-hint`}>
          {point ? t('mapPickHint') : t('mapEmptyHint')}
        </p>
        <p role="status" className="text-sm">
          {precision === 'locating' && t('locatingNumber')}
          {precision === 'exact' && t('numberFound')}
          {precision === 'street' && (
            <span className="inline-flex items-start gap-1.5">
              <Icon name="warning" />
              {t('numberNotFound')}
            </span>
          )}
        </p>
        <LocationMap
          points={point ? [point] : []}
          label={t('mapOf', { name: values.name || t('newLocation') })}
          className="h-56"
          onPick={({ lat, lng }) => {
            set({ lat, lng });
            setPrecision('idle');
          }}
        />
        {point && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              set({ lat: null, lng: null });
              setPrecision('idle');
            }}
          >
            <Icon name="close" />
            {t('removePin')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>
          <Icon name={location ? 'save' : 'add'} />
          {location ? tc('save') : t('add')}
        </button>
        {onDone && location && (
          <button type="button" className="btn-secondary" onClick={onDone}>
            {tc('cancel')}
          </button>
        )}
      </div>
      <p role="status" className="muted text-sm">
        {!error && saved}
      </p>
      <FormError message={error} />
    </form>
  );
}
