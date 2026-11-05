'use client';

import { utcToZonedLocalInput, zonedLocalToUtc } from '@boramarcar/core/time';
import { useTimeZone, useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';

type Status = 'scheduled' | 'cancelled' | 'finished';

interface Props {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  locationId: string | null;
  status: Status;
  locations: { id: string; name: string }[];
}

/** Edição do encontro e ações de status (para quem criou ou admins). */
export function EventManage(props: Props) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [title, setTitle] = useState(props.title);
  const [startsAt, setStartsAt] = useState(
    utcToZonedLocalInput(new Date(props.startsAt), timeZone),
  );
  const [endsAt, setEndsAt] = useState(
    props.endsAt ? utcToZonedLocalInput(new Date(props.endsAt), timeZone) : '',
  );
  const [locationId, setLocationId] = useState(props.locationId ?? '');

  const patch = (body: Record<string, unknown>, after?: () => void) =>
    run(
      () => api(`/api/v1/events/${props.eventId}`, { method: 'PATCH', body }),
      () => {
        setSaved(true);
        after?.();
      },
    );

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          void patch({
            title,
            startsAt: zonedLocalToUtc(startsAt, timeZone).toISOString(),
            endsAt: endsAt ? zonedLocalToUtc(endsAt, timeZone).toISOString() : null,
            locationId: locationId || null,
          });
        }}
      >
        <div className="sm:col-span-2">
          <label className="label" htmlFor="edit-title">
            {t('eventTitle')}
          </label>
          <input
            id="edit-title"
            className="input"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-start">
            {t('when')}
          </label>
          <input
            id="edit-start"
            type="datetime-local"
            className="input"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-end">
            {t('end')} <span className="muted">({tc('optional')})</span>
          </label>
          <input
            id="edit-end"
            type="datetime-local"
            className="input"
            min={startsAt}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="edit-location">
            {t('where')}
          </label>
          <select
            id="edit-location"
            className="input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">{tc('locationTbd')}</option>
            {props.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={pending}>
            {tc('save')}
          </button>
          {saved && !error && (
            <span role="status" className="muted">
              {t('saved')}
            </span>
          )}
        </div>
      </form>

      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {props.status === 'scheduled' && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => void patch({ status: 'finished' })}
            >
              {t('finish')}
            </button>
            <button
              type="button"
              className={
                confirmCancel
                  ? 'btn-danger border border-red-300 dark:border-red-800'
                  : 'btn-danger'
              }
              disabled={pending}
              onBlur={() => setConfirmCancel(false)}
              onClick={() => {
                if (!confirmCancel) return setConfirmCancel(true);
                setConfirmCancel(false);
                void patch({ status: 'cancelled' });
              }}
            >
              {confirmCancel ? t('cancelConfirm') : t('cancelEvent')}
            </button>
          </>
        )}
        {props.status !== 'scheduled' && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => void patch({ status: 'scheduled' })}
          >
            {t('reopen')}
          </button>
        )}
      </div>
      <FormError message={error} />
    </div>
  );
}

export function EventStatusBadge({ status }: { status: Status }) {
  const t = useTranslations('events.status');
  const styles: Record<Status, string> = {
    scheduled: 'bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    finished: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {t(status)}
    </span>
  );
}
