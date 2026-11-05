'use client';

import { useLocale, useTimeZone, useTranslations } from 'next-intl';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { LOCALES, type Locale } from '@/i18n/config';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

function listTimeZones(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [current];
  return zones.includes(current) ? zones : [current, ...zones];
}

export function ProfileForm() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const currentTimeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const currentLocale = useLocale() as Locale;
  const { run, error, pending } = useApiAction();
  const [timeZone, setTimeZone] = useState(currentTimeZone);
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const browserTimeZone = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  const [saved, setSaved] = useState(false);
  const zones = useMemo(() => listTimeZones(currentTimeZone), [currentTimeZone]);

  return (
    <form
      className="max-w-lg space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () => api('/api/v1/me/preferences', { method: 'PUT', body: { timeZone, locale } }),
          () => setSaved(true),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="profile-tz">
          {t('timeZone')}
        </label>
        <select
          id="profile-tz"
          className="select"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <p className="muted mt-1">{t('timeZoneHint')}</p>
        {browserTimeZone && browserTimeZone !== timeZone && (
          <p className="muted mt-1">
            {t('detected', { timeZone: browserTimeZone })} ·{' '}
            <button
              type="button"
              className="text-brand-600 underline dark:text-brand-400"
              onClick={() => setTimeZone(browserTimeZone)}
            >
              {t('useDetected')}
            </button>
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="profile-locale">
          {t('language')}
        </label>
        <select
          id="profile-locale"
          className="select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {t(`languages.${l}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
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
      <FormError message={error} />
    </form>
  );
}
