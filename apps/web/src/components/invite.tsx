'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

/** Aceita um convite (usuário já logado) e leva para o painel. */
export function JoinInviteButton({ inviteCode }: { inviteCode: string }) {
  const t = useTranslations('invite');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  return (
    <>
      <button
        type="button"
        className="btn-primary px-6 text-base"
        disabled={pending}
        onClick={() =>
          void run(
            () => api('/api/v1/groups/join', { method: 'POST', body: { inviteCode } }),
            // Primeiro passo de quem acabou de entrar: dizer quando pode jogar (onboarding 7.3).
            () => router.push('/disponibilidade?bemvindo=1'),
          )
        }
      >
        <Icon name="join" />
        {t('join')}
      </button>
      <FormError message={error} />
    </>
  );
}

/** Troca o código de convite. Pede um segundo clique para confirmar. */
export function RegenerateInviteButton({ groupId }: { groupId: string }) {
  const t = useTranslations('group');
  const { run, error, pending } = useApiAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        type="button"
        className={
          confirming ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-secondary'
        }
        disabled={pending}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setConfirming(false);
          void run(() => api(`/api/v1/groups/${groupId}/invite`, { method: 'POST' }));
        }}
        onBlur={() => setConfirming(false)}
      >
        <Icon name="refresh" />
        {confirming ? t('regenerateConfirm') : t('regenerate')}
      </button>
      <FormError message={error} />
    </>
  );
}
