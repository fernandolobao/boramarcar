'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALES, type Locale } from '@/i18n/config';
import { api } from '@/lib/api';
import { Icon } from './icons';

/**
 * Seletor de idioma das páginas públicas: "PT | EN". Grava o cookie (e o perfil, para quem
 * entrou) e recarrega a página no idioma escolhido.
 */
export function LanguageSwitcher() {
  const t = useTranslations('languageSwitcher');
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (locale === current) return;
    startTransition(async () => {
      await api('/api/v1/locale', { method: 'PUT', body: { locale } }).catch(() => {});
      router.refresh();
    });
  };

  return (
    <div role="group" aria-label={t('label')} className="flex items-center gap-1">
      <Icon name="language" className="hidden size-4 shrink-0 text-fg-muted min-[400px]:block" />
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() => choose(locale)}
          className={`min-h-6 min-w-6 cursor-pointer rounded-md px-2 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed ${
            locale === current ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {locale.split('-')[0]!.toUpperCase()}
          <span className="sr-only"> — {t(`names.${locale}`)}</span>
        </button>
      ))}
    </div>
  );
}
