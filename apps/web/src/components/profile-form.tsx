'use client';

import { useLocale, useTimeZone, useTranslations } from 'next-intl';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { LOCALES, type Locale } from '@/i18n/config';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';
import { Select } from '@/components/ds/select';
import { Checkbox } from '@/components/ds/checkbox';
import { CityPicker, type CityOption } from './places/city-picker';

function listTimeZones(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [current];
  return zones.includes(current) ? zones : [current, ...zones];
}

export function ProfileForm({
  emailNotifications = true,
  city: initialCity = null,
}: {
  emailNotifications?: boolean;
  /** Cidade do perfil (10.3), usada em "Lojas e eventos". */
  city?: CityOption | null;
}) {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const currentTimeZone = useTimeZone() ?? 'America/Sao_Paulo';
  const currentLocale = useLocale() as Locale;
  const { run, error, pending } = useApiAction();
  const [timeZone, setTimeZone] = useState(currentTimeZone);
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [notify, setNotify] = useState(emailNotifications);
  const [city, setCity] = useState<CityOption | null>(initialCity);
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
          () =>
            api('/api/v1/me/preferences', {
              method: 'PUT',
              body: {
                timeZone,
                locale,
                emailNotifications: notify,
                ...(city ? { municipalityCode: city.code } : {}),
              },
            }),
          () => setSaved(true),
        );
      }}
    >
      <div>
        <Select
          label={t('timeZone')}
          id="profile-tz"
          value={String(timeZone)}
          onChange={(v) => setTimeZone(v)}
          options={[
            ...zones.map((zone) => ({ value: String(zone), label: zone.replaceAll('_', ' ') })),
          ]}
        />
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
        <Select
          label={t('language')}
          id="profile-locale"
          value={String(locale)}
          onChange={(v) => setLocale(v as Locale)}
          options={LOCALES.map((l) => ({ value: String(l), label: t(`languages.${l}`) }))}
        />
      </div>
      <div>
        <CityPicker id="profile-city" label={t('city')} value={city} onChange={setCity} />
        <p className="muted mt-1">{t('cityHint')}</p>
      </div>
      <div>
        <Checkbox
          label={t('emailNotifications')}
          checked={notify}
          description={t('emailNotificationsHint')}
          onChange={setNotify}
        />
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
