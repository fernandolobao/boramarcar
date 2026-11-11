'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

/**
 * Direitos do titular (LGPD, art. 18) em autoatendimento: baixar os próprios dados (JSON) e
 * excluir a conta. A exclusão pede confirmação em dois cliques e avisa antes o que acontece
 * com os grupos de que a pessoa é dona.
 */
export function DataRights({
  transfers,
  deletions,
}: {
  /** Grupos que passam para outro dono. */
  transfers: string[];
  /** Grupos que só têm a pessoa e serão apagados. */
  deletions: string[];
}) {
  const t = useTranslations('privacySettings');
  const { run, error, pending } = useApiAction();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold">{t('exportTitle')}</h3>
        <p className="muted text-sm">{t('exportHint')}</p>
        <a href="/api/v1/me/export" download className="btn-secondary">
          <Icon name="download" />
          {t('export')}
        </a>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">{t('deleteTitle')}</h3>
        <p className="muted text-sm">{t('deleteHint')}</p>
        {transfers.length > 0 && (
          <p className="text-sm">{t('deleteTransfers', { groups: transfers.join(', ') })}</p>
        )}
        {deletions.length > 0 && (
          <p className="text-sm">{t('deleteDeletions', { groups: deletions.join(', ') })}</p>
        )}
        <button
          type="button"
          className={confirming ? 'btn-danger border border-danger' : 'btn-danger'}
          disabled={pending}
          aria-describedby={confirming ? 'delete-account-warning' : undefined}
          onBlur={() => setConfirming(false)}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            setConfirming(false);
            void run(
              () => api('/api/v1/me', { method: 'DELETE', body: { confirm: true } }),
              // Recarga completa (não router.push): a sessão acabou e nada do app deve sobrar.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              () => window.location.assign('/?conta=excluida'),
            );
          }}
        >
          <Icon name="delete" />
          {pending ? t('deleting') : confirming ? t('confirmDelete') : t('delete')}
        </button>
        {confirming && (
          <p id="delete-account-warning" role="alert" className="text-sm text-danger">
            {t('confirmHint')}
          </p>
        )}
        <FormError message={error} />
      </div>
    </div>
  );
}
