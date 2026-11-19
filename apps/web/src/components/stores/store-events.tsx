'use client';

import { GAME_FORMATS, type GameFormat } from '@boramarcar/core';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import { useTimeZone, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Checkbox } from '../ds/checkbox';
import { Choices } from '../ds/choices';
import { DateTimeField, fromLocalDateTime, toLocalDateTime } from '../ds/date-time-field';
import { NumberField } from '../ds/number-field';
import { Select } from '../ds/select';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

function TextArea({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="input min-h-20 py-2"
        maxLength={2000}
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-hint`} className="muted mt-1 text-sm">
        {hint}
      </p>
    </div>
  );
}

/** Novo evento da loja (equipe): título, quando, formato, tipo, vagas, premiação e regras. */
export function StoreEventForm({ storeId, slug }: { storeId: string; slug: string }) {
  const t = useTranslations('storeEvents');
  const tf = useTranslations('formats');
  const tds = useTranslations('ds');
  const router = useRouter();
  const id = useId();
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [format, setFormat] = useState<GameFormat>('commander');
  const [kind, setKind] = useState<'tournament' | 'casual'>('tournament');
  const [capacity, setCapacity] = useState<number | null>(null);
  const [prizes, setPrizes] = useState('');
  const [rules, setRules] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!startsAt) return setDateError(tds('dateRequired'));
        void run(
          () =>
            api<{ event: { id: string } }>(`/api/v1/stores/${storeId}/events`, {
              method: 'POST',
              body: {
                title,
                startsAt: zonedLocalToUtc(startsAt, timeZone).toISOString(),
                format,
                kind,
                capacity,
                prizes: prizes || null,
                rules: rules || null,
              },
            }),
          ({ event }) => router.push(`/lojas/${slug}/eventos/${event.id}/gerenciar`),
        );
      }}
    >
      <div>
        <label className="label" htmlFor={`${id}-title`}>
          {t('title')}
        </label>
        <input
          id={`${id}-title`}
          className="input"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <DateTimeField
        legend={t('when')}
        value={fromLocalDateTime(startsAt)}
        onChange={(v) => {
          setStartsAt(toLocalDateTime(v));
          setDateError(null);
        }}
        error={dateError ?? undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t('format')}
          value={format}
          onChange={setFormat}
          options={GAME_FORMATS.map((f) => ({ value: f, label: tf(f) }))}
        />
        <NumberField
          label={t('capacity')}
          value={capacity}
          onChange={setCapacity}
          min={1}
          max={512}
          description={t('capacityHint')}
        />
      </div>
      <Choices
        label={t('kindLabel')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'tournament', label: t('kind.tournament') },
          { value: 'casual', label: t('kind.casual') },
        ]}
      />
      <TextArea
        id={`${id}-prizes`}
        label={t('prizesLabel')}
        hint={t('prizesHint')}
        value={prizes}
        onChange={setPrizes}
      />
      <TextArea
        id={`${id}-rules`}
        label={t('rulesLabel')}
        hint={t('rulesHint')}
        value={rules}
        onChange={setRules}
      />
      <FormError message={error} />
      <button className="btn-primary" disabled={pending || !title.trim()}>
        <Icon name="add" />
        {t('create')}
      </button>
    </form>
  );
}

/** Inscrever-se ou desistir (página pública do evento, com login). */
export function StoreEventRegistration({
  eventId,
  myEntry,
}: {
  eventId: string;
  myEntry: { id: string; status: 'registered' | 'waitlist' } | null;
}) {
  const t = useTranslations('storeEvents');
  const { run, error, pending } = useApiAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-2">
      {myEntry ? (
        <>
          <p role="status" className="font-medium">
            {myEntry.status === 'registered' ? t('registered') : t('waitlisted')}
          </p>
          <button
            type="button"
            className={
              confirm ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'
            }
            disabled={pending}
            onBlur={() => setConfirm(false)}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              setConfirm(false);
              void run(() => api(`/api/v1/store-entries/${myEntry.id}`, { method: 'DELETE' }));
            }}
          >
            <Icon name="close" />
            {confirm ? t('leaveConfirm') : t('leave')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            void run(() => api(`/api/v1/store-events/${eventId}/entries`, { method: 'POST' }))
          }
        >
          <Icon name="add" />
          {t('register')}
        </button>
      )}
      <FormError message={error} />
    </div>
  );
}

/** Check-in de uma inscrição: marca na hora (otimista) e desfaz se a API recusar. */
function CheckInBox({
  entryId,
  name,
  initial,
}: {
  entryId: string;
  name: string;
  initial: boolean;
}) {
  const t = useTranslations('storeEvents');
  const { run, error } = useApiAction();
  const [checked, setChecked] = useState(initial);
  return (
    <span className="flex flex-col">
      <Checkbox
        label={t('checkIn')}
        checked={checked}
        onChange={(next) => {
          setChecked(next);
          void run(() =>
            api(`/api/v1/store-entries/${entryId}`, {
              method: 'PATCH',
              body: { checkedIn: next },
            }),
          ).then((result) => {
            if (result === undefined) setChecked(!next);
          });
        }}
      >
        <span className="sr-only">({name})</span>
      </Checkbox>
      <FormError message={error} />
    </span>
  );
}

export interface StaffEntry {
  id: string;
  name: string;
  guest: boolean;
  status: 'registered' | 'waitlist';
  checkedIn: boolean;
}

/** Visão da equipe: check-in, tirar inscrição, convidado sem conta, vagas e textos, cancelar. */
export function StoreEventStaff({
  eventId,
  slug,
  entries,
  initial,
  cancelled,
}: {
  eventId: string;
  slug: string;
  entries: StaffEntry[];
  initial: { capacity: number | null; prizes: string; rules: string };
  cancelled: boolean;
}) {
  const t = useTranslations('storeEvents');
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [guest, setGuest] = useState('');
  const [capacity, setCapacity] = useState(initial.capacity);
  const [prizes, setPrizes] = useState(initial.prizes);
  const [rules, setRules] = useState(initial.rules);
  const [status, setStatus] = useState('');
  const danger = (key: string) =>
    confirm === key ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger';

  return (
    <div className="space-y-6">
      <section className="card space-y-3" aria-labelledby={`${id}-entries`}>
        <h2 id={`${id}-entries`} className="section-title mb-0">
          {t('entries')}
        </h2>
        {entries.length === 0 ? (
          <p className="muted">{t('noEntries')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{e.name}</span>
                  <span className="muted text-sm">
                    {' · '}
                    {t(`status.${e.status}`)}
                    {e.guest && ` · ${t('guest')}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {e.status === 'registered' && (
                    <CheckInBox entryId={e.id} name={e.name} initial={e.checkedIn} />
                  )}
                  <button
                    type="button"
                    className={danger(e.id)}
                    disabled={pending}
                    onBlur={() => setConfirm(null)}
                    onClick={() => {
                      if (confirm !== e.id) return setConfirm(e.id);
                      setConfirm(null);
                      void run(() => api(`/api/v1/store-entries/${e.id}`, { method: 'DELETE' }));
                    }}
                  >
                    <Icon name="delete" />
                    {confirm === e.id ? t('removeConfirm') : t('remove')}
                    <span className="sr-only"> ({e.name})</span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {!cancelled && (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              void run(
                () =>
                  api(`/api/v1/store-events/${eventId}/guests`, {
                    method: 'POST',
                    body: { name: guest },
                  }),
                () => setGuest(''),
              );
            }}
          >
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor={`${id}-guest`}>
                {t('addGuest')}
              </label>
              <input
                id={`${id}-guest`}
                className="input"
                required
                maxLength={60}
                value={guest}
                onChange={(ev) => setGuest(ev.target.value)}
              />
            </div>
            <button className="btn-secondary" disabled={pending}>
              <Icon name="add" />
              {t('add')}
            </button>
          </form>
        )}
      </section>

      {!cancelled && (
        <section className="card space-y-3" aria-labelledby={`${id}-edit`}>
          <h2 id={`${id}-edit`} className="section-title mb-0">
            {t('edit')}
          </h2>
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              setStatus('');
              void run(
                () =>
                  api(`/api/v1/store-events/${eventId}`, {
                    method: 'PATCH',
                    body: { capacity, prizes: prizes || null, rules: rules || null },
                  }),
                () => setStatus(t('saved')),
              );
            }}
          >
            <NumberField
              label={t('capacity')}
              value={capacity}
              onChange={setCapacity}
              min={1}
              max={512}
              description={t('capacityHint')}
            />
            <TextArea
              id={`${id}-prizes`}
              label={t('prizesLabel')}
              hint={t('prizesHint')}
              value={prizes}
              onChange={setPrizes}
            />
            <TextArea
              id={`${id}-rules`}
              label={t('rulesLabel')}
              hint={t('rulesHint')}
              value={rules}
              onChange={setRules}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" disabled={pending}>
                <Icon name="save" />
                {t('save')}
              </button>
              <p role="status" className="muted text-sm">
                {status}
              </p>
            </div>
          </form>
          <button
            type="button"
            className={danger('event')}
            disabled={pending}
            onBlur={() => setConfirm(null)}
            onClick={() => {
              if (confirm !== 'event') return setConfirm('event');
              setConfirm(null);
              void run(
                () => api(`/api/v1/store-events/${eventId}/cancel`, { method: 'POST' }),
                () => router.push(`/lojas/${slug}/gerenciar`),
              );
            }}
          >
            <Icon name="delete" />
            {confirm === 'event' ? t('cancelEventConfirm') : t('cancelEvent')}
          </button>
        </section>
      )}
      <FormError message={error} />
    </div>
  );
}

/** Código do balcão: a pessoa digita e entra no evento. */
export function EventCodeForm() {
  const t = useTranslations('storeEvents');
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [code, setCode] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api<{ entry: { eventId: string; slug: string } }>('/api/v1/store-events/by-code', {
              method: 'POST',
              body: { code },
            }),
          (r) => router.push(`/lojas/${r.entry.slug}/eventos/${r.entry.eventId}`),
        );
      }}
    >
      <div>
        <label className="label" htmlFor={`${id}-code`}>
          {t('codeLabel')}
        </label>
        <input
          id={`${id}-code`}
          className="input w-44 text-center font-mono text-lg tracking-widest uppercase"
          required
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <FormError message={error} />
      <button className="btn-primary" disabled={pending}>
        <Icon name="add" />
        {t('codeSubmit')}
      </button>
    </form>
  );
}
