'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { CONSENT_EVENT, consentFromCookies, saveConsent, type Consent } from '@/lib/consent';
import { Choices } from './ds/choices';

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

/** Mudar a escolha do aviso de cookies a qualquer momento (LGPD, art. 8º, § 5º). */
export function ConsentSettings() {
  const t = useTranslations('consent');
  // A escolha mora no cookie; o evento avisa quando muda (aqui ou no aviso de cookies).
  const consent = useSyncExternalStore<Consent | null>(
    subscribe,
    () => consentFromCookies(document.cookie),
    () => null,
  );
  const [saved, setSaved] = useState(false);

  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{t('settingsTitle')}</legend>
      <p className="muted text-sm">
        {t.rich('settingsHint', {
          link: (chunks) => (
            <Link href="/privacidade" className="text-link underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <Choices
        label={t('settingsTitle')}
        hideLabel
        value={consent ?? null}
        onChange={(value) => {
          saveConsent(value);
          setSaved(true);
        }}
        options={[
          { value: 'accepted', label: t('optionAccept') },
          { value: 'rejected', label: t('optionReject') },
        ]}
      />
      <p role="status" className="text-sm text-success">
        {saved ? t('saved') : ''}
      </p>
    </fieldset>
  );
}
