'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon, type IconName } from './icons';
import { FormError, useApiAction } from './use-api-action';

export type FirstStepKey = 'availability' | 'invite' | 'rsvp' | 'deck';

const LINKS: Record<FirstStepKey, { href: string; icon: IconName }> = {
  availability: { href: '/disponibilidade', icon: 'availability' },
  invite: { href: '/grupo', icon: 'join' },
  rsvp: { href: '/eventos', icon: 'events' },
  deck: { href: '/decks/importar', icon: 'decks' },
};

/**
 * Primeiros passos no painel (onboarding 7.2): o que falta para aproveitar o grupo. Os passos
 * vêm dos dados (feito por qualquer caminho conta); "Dispensar" esconde a lista para sempre
 * (guardado no servidor, vale no site e no app). Estado em texto e ícone, não só em cor.
 */
export function FirstSteps({
  steps,
  members,
  tableSize,
}: {
  steps: readonly { key: FirstStepKey; done: boolean }[];
  members: number;
  tableSize: number;
}) {
  const t = useTranslations('onboarding');
  const [hidden, setHidden] = useState(false);
  const { run, error, pending } = useApiAction();
  if (hidden) return null;
  const done = steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="primeiros-passos" className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="primeiros-passos" className="section-title mb-1">
            {t('title')}
          </h2>
          <p className="muted text-sm">{t('progress', { done, total: steps.length })}</p>
        </div>
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
                  body: { flag: 'checklist-dismissed' },
                }),
              () => {
                setHidden(true);
                // O botão some: o foco volta para o conteúdo principal, não para o início da página.
                document.getElementById('conteudo')?.focus();
              },
            )
          }
        >
          <Icon name="close" />
          {t('dismiss')}
        </button>
      </div>
      {/* Barra decorativa: o progresso está em texto acima. */}
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map(({ key, done: isDone }) => {
          const link = LINKS[key];
          const hint = {
            availability: () => t('availabilityHint'),
            invite: () => t('inviteHint', { count: tableSize, members }),
            rsvp: () => t('rsvpHint'),
            deck: () => t('deckHint'),
          }[key]();
          return (
            <li key={key}>
              <Link
                href={link.href}
                className={`flex h-full items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-muted motion-reduce:transition-none ${
                  isDone ? 'border-line' : 'border-line-strong'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                    isDone ? 'bg-primary text-on-primary' : 'bg-surface-muted text-fg'
                  }`}
                >
                  <Icon name={isDone ? 'done' : link.icon} />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-medium ${isDone ? 'text-fg-muted line-through' : ''}`}
                  >
                    {t(key)}
                  </span>
                  <span className="sr-only"> — {isDone ? t('done') : t('todo')}</span>
                  {!isDone && <span className="muted block text-sm">{hint}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <FormError message={error} />
    </section>
  );
}
