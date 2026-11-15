'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/** Título do passo do guia: recebe o foco ao abrir, para o leitor de tela anunciar o passo novo. */
export function GuideHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <h1 ref={ref} tabIndex={-1} className="page-title focus:outline-none">
      {children}
    </h1>
  );
}

function useGuideMark(flag: 'guide-skipped' | 'guide-completed', to: string) {
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const go = () =>
    void run(
      () => api('/api/v1/me/onboarding', { method: 'POST', body: { flag } }),
      () => router.push(to),
    );
  return { go, error, pending };
}

/** "Pular o guia": nunca é obrigatório. Sem grupo, segue para a tela do grupo. */
export function GuideSkip({ hasGroup }: { hasGroup: boolean }) {
  const t = useTranslations('guide');
  const { go, error, pending } = useGuideMark('guide-skipped', hasGroup ? '/painel' : '/grupo');
  return (
    <div>
      <button type="button" className="btn-secondary" disabled={pending} onClick={go}>
        {t('skip')}
      </button>
      <FormError message={error} />
    </div>
  );
}

/** Fim do guia: marca como concluído e abre o painel. */
export function GuideFinish() {
  const t = useTranslations('guide');
  const { go, error, pending } = useGuideMark('guide-completed', '/painel');
  return (
    <div>
      <button type="button" className="btn-primary" disabled={pending} onClick={go}>
        <Icon name="dashboard" />
        {t('finish')}
      </button>
      <FormError message={error} />
    </div>
  );
}
