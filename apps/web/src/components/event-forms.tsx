'use client';

import { useTimeZone, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

export function NewEventForm({
  groupId,
  locations,
}: {
  groupId: string;
  locations: { id: string; name: string }[];
}) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const router = useRouter();
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [title, setTitle] = useState(t('defaultTitle'));
  const [startsAt, setStartsAt] = useState('');
  const [locationId, setLocationId] = useState('');

  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api<{ event: { id: string } }>(`/api/v1/groups/${groupId}/events`, {
              method: 'POST',
              body: {
                title,
                startsAt: zonedLocalToUtc(startsAt, timeZone).toISOString(),
                locationId: locationId || null,
              },
            }),
          ({ event }) => router.push(`/eventos/${event.id}`),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="event-title">
          {t('eventTitle')}
        </label>
        <input
          id="event-title"
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="event-start">
          {t('when')}
        </label>
        <input
          id="event-start"
          type="datetime-local"
          className="input"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="event-location">
          {t('where')}
        </label>
        <select
          id="event-location"
          className="select"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">{tc('locationTbd')}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>
        <Icon name="add" />
        {t('new')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: 'yes' | 'maybe' | 'no' | null;
}) {
  const t = useTranslations('events.rsvp');
  const te = useTranslations('events');
  const { run, pending } = useApiAction();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={te('rsvpLabel')}>
      {(['yes', 'maybe', 'no'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          disabled={pending}
          className={current === value ? 'btn-primary' : 'btn-secondary'}
          onClick={() =>
            void run(() =>
              api(`/api/v1/events/${eventId}/rsvp`, { method: 'PUT', body: { rsvp: value } }),
            )
          }
        >
          <Icon name={value === 'yes' ? 'rsvpYes' : value === 'maybe' ? 'rsvpMaybe' : 'rsvpNo'} />
          {t(value)}
        </button>
      ))}
    </div>
  );
}
