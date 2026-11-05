'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, localInputToIso } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';

interface LocationOption {
  id: string;
  name: string;
}

export function AvailabilityForm({
  groupId,
  locations,
}: {
  groupId: string;
  locations: LocationOption[];
}) {
  const t = useTranslations('availability');
  const tc = useTranslations('common');
  const { run, error, pending } = useApiAction();
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api(`/api/v1/groups/${groupId}/availability`, {
              method: 'POST',
              body: {
                startsAt: localInputToIso(startsAt),
                endsAt: localInputToIso(endsAt),
                locationIds: selected,
                note: note || null,
              },
            }),
          () => {
            setNote('');
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="slot-start">
            {t('start')}
          </label>
          <input
            id="slot-start"
            type="datetime-local"
            className="input"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="slot-end">
            {t('end')}
          </label>
          <input
            id="slot-end"
            type="datetime-local"
            className="input"
            required
            min={startsAt}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      {locations.length > 0 && (
        <fieldset>
          <legend className="label">{t('locations')}</legend>
          <p className="muted mb-2">{t('locationsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <label
                key={location.id}
                className="flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(location.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, location.id]
                        : prev.filter((id) => id !== location.id),
                    )
                  }
                />
                {location.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div>
        <label className="label" htmlFor="slot-note">
          {t('note')} <span className="muted">({tc('optional')})</span>
        </label>
        <input
          id="slot-note"
          className="input"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button className="btn-primary" disabled={pending}>
        {t('add')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function DeleteButton({
  path,
  label,
  redirectTo,
}: {
  path: string;
  label?: string;
  redirectTo?: string;
}) {
  const tc = useTranslations('common');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  return (
    <>
      <button
        type="button"
        className="btn-danger"
        disabled={pending}
        onClick={() =>
          void run(
            () => api(path, { method: 'DELETE' }),
            () => redirectTo && router.push(redirectTo),
          )
        }
      >
        {label ?? tc('delete')}
      </button>
      <FormError message={error} />
    </>
  );
}

export function CreateEventFromWindowButton(props: {
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  locationId: string | null;
  participantIds: string[];
}) {
  const t = useTranslations('availability');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  return (
    <>
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          void run(
            () =>
              api<{ event: { id: string } }>(`/api/v1/groups/${props.groupId}/events`, {
                method: 'POST',
                body: {
                  title: props.title,
                  startsAt: props.startsAt,
                  endsAt: props.endsAt,
                  locationId: props.locationId,
                  participantIds: props.participantIds,
                },
              }),
            ({ event }) => router.push(`/eventos/${event.id}`),
          )
        }
      >
        {t('createEvent')}
      </button>
      <FormError message={error} />
    </>
  );
}
