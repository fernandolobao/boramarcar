'use client';

import { useLocale, useTimeZone, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { api } from '@/lib/api';
import { WEEKDAY_ORDER, weekdayNames } from '@/lib/weekdays';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

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
  const locale = useLocale();
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [frequency, setFrequency] = useState<'once' | 'weekly'>('once');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const names = weekdayNames(locale);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        if (frequency === 'weekly' && weekdays.length === 0) {
          setLocalError(t('chooseWeekday'));
          return;
        }
        void run(
          () =>
            frequency === 'once'
              ? api(`/api/v1/groups/${groupId}/availability`, {
                  method: 'POST',
                  body: {
                    startsAt: zonedLocalToUtc(startsAt, timeZone).toISOString(),
                    endsAt: zonedLocalToUtc(endsAt, timeZone).toISOString(),
                    locationIds: selected,
                    note: note || null,
                  },
                })
              : api(`/api/v1/groups/${groupId}/availability-rules`, {
                  method: 'POST',
                  body: {
                    weekdays,
                    startTime,
                    endTime,
                    timeZone,
                    locationIds: selected,
                    note: note || null,
                  },
                }),
          () => {
            setNote('');
            setWeekdays([]);
          },
        );
      }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('frequency')}>
        {(['once', 'weekly'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={frequency === value}
            className={frequency === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFrequency(value)}
          >
            <Icon name={value} />
            {t(value)}
          </button>
        ))}
      </div>

      {frequency === 'once' ? (
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
      ) : (
        <>
          <fieldset>
            <legend className="label">{t('weekdays')}</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_ORDER.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 rounded-xl border border-zinc-500 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={weekdays.includes(day)}
                    onChange={(e) =>
                      setWeekdays((prev) =>
                        e.target.checked ? [...prev, day] : prev.filter((d) => d !== day),
                      )
                    }
                  />
                  {names[day]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="rule-start">
                {t('startTime')}
              </label>
              <input
                id="rule-start"
                type="time"
                className="input"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="rule-end">
                {t('endTime')}
              </label>
              <input
                id="rule-end"
                type="time"
                className="input"
                required
                aria-describedby="rule-end-hint"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <p id="rule-end-hint" className="muted mt-1">
                {t('overnightHint')}
              </p>
            </div>
          </div>
        </>
      )}
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
        <Icon name="add" />
        {t('add')}
      </button>
      <FormError message={localError ?? error} />
    </form>
  );
}

export function DeleteButton({
  path,
  label,
  context,
  redirectTo,
}: {
  path: string;
  /** Texto visível (padrão: "Remover"). */
  label?: string;
  /** Contexto só para leitores de tela, ex.: qual item será removido. */
  context?: string;
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
        <Icon name="delete" />
        {label ?? tc('delete')}
        {context && <span className="sr-only"> ({context})</span>}
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
        <Icon name="createEvent" />
        {t('createEvent')}
      </button>
      <FormError message={error} />
    </>
  );
}

/** Botão que dispara uma chamada à API (ex.: pular uma data da regra semanal). */
export function ApiActionButton({
  path,
  method,
  body,
  children,
  label,
  className = 'btn-secondary',
}: {
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  children: React.ReactNode;
  /** Nome acessível com contexto; deve conter o texto visível (WCAG 2.5.3). */
  label?: string;
  className?: string;
}) {
  const { run, error, pending } = useApiAction();
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        disabled={pending}
        onClick={() => void run(() => api(path, { method, body }))}
      >
        {children}
      </button>
      <FormError message={error} />
    </>
  );
}
