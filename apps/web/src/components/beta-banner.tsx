'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/**
 * Faixa "Você está no beta" (8.5) no painel dos grupos do beta, com a semana e o link do
 * feedback. "Dispensar" vale para sempre (guardado no servidor, como os primeiros passos).
 */
export function BetaBanner({ week, weeks, until }: { week: number; weeks: number; until: string }) {
  const t = useTranslations('beta');
  const [hidden, setHidden] = useState(false);
  const { run, error, pending } = useApiAction();
  if (hidden) return null;
  return (
    <section
      aria-labelledby="beta-faixa"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary bg-surface p-4"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
      >
        <Icon name="feedback" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="beta-faixa" className="font-semibold">
          {t('title')}
        </h2>
        <p className="muted">{t('body', { week, weeks, until })}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/feedback?de=/painel" className="btn-primary text-sm">
          {t('cta')}
        </Link>
        <button
          type="button"
          className="btn-secondary text-sm"
          aria-label={t('dismissLabel')}
          disabled={pending}
          onClick={() =>
            void run(
              () =>
                api('/api/v1/me/onboarding', {
                  method: 'POST',
                  body: { flag: 'beta-banner-dismissed' },
                }),
              () => {
                setHidden(true);
                document.getElementById('conteudo')?.focus();
              },
            )
          }
        >
          <Icon name="close" />
          {t('dismiss')}
        </button>
      </div>
      <FormError message={error} />
    </section>
  );
}
