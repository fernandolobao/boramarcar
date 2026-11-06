'use client';

import { zonedLocalToUtc } from '@boramarcar/core/time';
import { useTimeZone, useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

/** "AAAA-MM-DD" do dia seguinte (o fim da temporada é exclusivo). */
export const nextDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Cria temporada: datas digitadas no fuso do usuário, do primeiro ao último dia (inclusive). */
export function SeasonForm({ groupId }: { groupId: string }) {
  const t = useTranslations('ranking.seasons');
  const timeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [created, setCreated] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setCreated(false);
        void run(
          () =>
            api(`/api/v1/groups/${groupId}/seasons`, {
              method: 'POST',
              body: {
                name,
                startsAt: zonedLocalToUtc(`${start}T00:00`, timeZone).toISOString(),
                endsAt: zonedLocalToUtc(`${nextDay(end)}T00:00`, timeZone).toISOString(),
              },
            }),
          () => {
            setCreated(true);
            setName('');
            setStart('');
            setEnd('');
          },
        );
      }}
    >
      <div>
        <label className="label" htmlFor="season-name">
          {t('name')}
        </label>
        <input
          id="season-name"
          className="input"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="season-start">
          {t('start')}
        </label>
        <input
          id="season-start"
          className="input"
          type="date"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="season-end">
          {t('end')}
        </label>
        <input
          id="season-end"
          className="input"
          type="date"
          required
          min={start || undefined}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <button className="btn-primary" disabled={pending}>
        <Icon name="add" />
        {t('create')}
      </button>
      {created && !error && (
        <p role="status" className="muted sm:col-span-4">
          {t('created')}
        </p>
      )}
      <div className="sm:col-span-4">
        <FormError message={error} />
      </div>
    </form>
  );
}
