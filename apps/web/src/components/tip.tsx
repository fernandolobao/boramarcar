'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

export type TipId = 'deck-analysis' | 'table' | 'collection';

/**
 * Título de uma tela densa com a dica (onboarding 7.4): um botão ⓘ ao lado do título abre e fecha
 * a dica. Na primeira vez ela vem aberta (sem roubar o foco); "Entendi" fecha e grava que a pessoa
 * já viu (no servidor, vale no app), e o foco volta para o ⓘ — a dica continua a um toque.
 */
export function TitleWithTip({
  id,
  dismissed,
  children,
}: {
  id: TipId;
  /** A pessoa já dispensou a dica: começa fechada. */
  dismissed: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('tips');
  const panelId = useId();
  const labelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(!dismissed);
  const [saved, setSaved] = useState(dismissed);
  const { run, error, pending } = useApiAction();

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{children}</div>
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-link hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-expanded:bg-surface-muted"
          aria-label={t('toggle')}
          title={t('toggle')}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="info" className="size-5" />
        </button>
      </div>
      {open && (
        <section
          id={panelId}
          aria-labelledby={labelId}
          className="flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3"
        >
          <Icon name="learn" className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 id={labelId} className="text-sm font-semibold">
                {t('label')}
              </h2>
              <p className="text-sm">{t(id)}</p>
              <FormError message={error} />
            </div>
            <button
              type="button"
              className="btn-secondary min-h-8 self-start px-3 text-sm"
              aria-label={t('dismissLabel')}
              disabled={pending}
              onClick={() =>
                saved
                  ? close()
                  : void run(
                      () =>
                        api('/api/v1/me/onboarding', {
                          method: 'POST',
                          body: { flag: `tip-${id}` },
                        }),
                      () => {
                        setSaved(true);
                        close();
                      },
                    )
              }
            >
              {t('dismiss')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
