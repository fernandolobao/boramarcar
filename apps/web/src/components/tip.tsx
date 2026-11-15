'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

export type TipId = 'deck-analysis' | 'table' | 'collection';

/**
 * Dica de uma tela densa (onboarding 7.4): aparece no topo, uma vez por pessoa, sem janela por
 * cima e sem tirar o foco. "Entendi" dispensa para sempre (guardado no servidor, vale no app).
 * Quem chama só a renderiza se ela ainda não foi dispensada.
 */
export function Tip({ id }: { id: TipId }) {
  const t = useTranslations('tips');
  const labelId = useId();
  const [hidden, setHidden] = useState(false);
  const { run, error, pending } = useApiAction();
  if (hidden) return null;
  return (
    <section
      aria-labelledby={labelId}
      className="flex items-start gap-3 rounded-2xl border border-line-strong bg-surface p-4"
    >
      <Icon name="learn" className="mt-0.5 size-5 shrink-0 text-link" />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 id={labelId} className="text-sm font-semibold">
          {t('label')}
        </h2>
        <p className="text-sm">{t(id)}</p>
        <button
          type="button"
          className="btn-secondary text-sm"
          aria-label={t('dismissLabel')}
          disabled={pending}
          onClick={() =>
            void run(
              () => api('/api/v1/me/onboarding', { method: 'POST', body: { flag: `tip-${id}` } }),
              () => {
                setHidden(true);
                // A dica some: o foco vai para o conteúdo principal, não para o início da página.
                document.getElementById('conteudo')?.focus();
              },
            )
          }
        >
          {t('dismiss')}
        </button>
        <FormError message={error} />
      </div>
    </section>
  );
}
