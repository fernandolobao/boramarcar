'use client';

import { GAME_FORMATS, type GameFormat, type GroupSettings } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

/** Configurações do grupo (1.12 e 2.7). Membros comuns veem os valores, sem editar. */
export function GroupSettingsForm({
  groupId,
  settings,
  canEdit,
}: {
  groupId: string;
  settings: GroupSettings;
  canEdit: boolean;
}) {
  const t = useTranslations('groupSettings');
  const tf = useTranslations('formats');
  const tc = useTranslations('common');
  const { run, error, pending } = useApiAction();
  const [values, setValues] = useState(settings);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof GroupSettings>(key: K, value: GroupSettings[K]) => {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  };
  const number = (
    key: 'tableSize' | 'minDurationMinutes' | 'pointsWin' | 'pointsDraw' | 'pointsLoss',
    min: number,
    max: number,
  ) => ({
    id: `settings-${key}`,
    className: 'input',
    type: 'number' as const,
    inputMode: 'numeric' as const,
    required: true,
    min,
    max,
    disabled: !canEdit,
    value: Number.isNaN(values[key]) ? '' : values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.valueAsNumber),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () => api(`/api/v1/groups/${groupId}/settings`, { method: 'PATCH', body: values }),
          () => setSaved(true),
        );
      }}
    >
      {!canEdit && <p className="muted text-sm">{t('readOnly')}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="settings-tableSize">
            {t('tableSize')}
          </label>
          <input {...number('tableSize', 2, 8)} aria-describedby="settings-tableSize-hint" />
        </div>
        <div>
          <label className="label" htmlFor="settings-minDurationMinutes">
            {t('minDuration')}
          </label>
          <input {...number('minDurationMinutes', 30, 720)} step={15} />
        </div>
        <div>
          <label className="label" htmlFor="settings-defaultFormat">
            {t('defaultFormat')}
          </label>
          <select
            id="settings-defaultFormat"
            className="select"
            disabled={!canEdit}
            value={values.defaultFormat}
            onChange={(e) => set('defaultFormat', e.target.value as GameFormat)}
          >
            {GAME_FORMATS.map((f) => (
              <option key={f} value={f}>
                {tf(f)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p id="settings-tableSize-hint" className="muted -mt-2 text-sm">
        {t('tableSizeHint')}
      </p>
      <fieldset>
        <legend className="label">{t('points')}</legend>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          {(
            [
              ['pointsWin', t('pointsWin'), 0],
              ['pointsDraw', t('pointsDraw'), 0],
              ['pointsLoss', t('pointsLoss'), -20],
            ] as const
          ).map(([key, label, min]) => (
            <div key={key}>
              <label className="label" htmlFor={`settings-${key}`}>
                {label}
              </label>
              <input {...number(key, min, 20)} aria-describedby="settings-points-hint" />
            </div>
          ))}
        </div>
        <p id="settings-points-hint" className="muted mt-1 text-sm">
          {t('pointsHint')}
        </p>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            <Icon name="save" />
            {tc('save')}
          </button>
          {saved && !error && (
            <span role="status" className="muted">
              {t('saved')}
            </span>
          )}
        </div>
      )}
      <FormError message={error} />
    </form>
  );
}
