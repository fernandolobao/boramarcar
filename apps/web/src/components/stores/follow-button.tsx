'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

/**
 * "Seguir loja" (10.4): botão liga/desliga (`aria-pressed`, o nome não muda). Sem conta, link
 * para entrar e voltar à loja.
 */
export function FollowStoreButton({
  storeId,
  slug,
  storeName,
  following: initial,
  signedIn,
}: {
  storeId: string;
  slug: string;
  storeName: string;
  following: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations('stores.follow');
  const { run, error, pending } = useApiAction();
  const [following, setFollowing] = useState(initial);
  const [status, setStatus] = useState('');

  if (!signedIn) {
    return (
      <Link
        href={`/entrar?para=${encodeURIComponent(`/lojas/${slug}`)}`}
        className="btn-secondary self-start"
      >
        <Icon name="notifications" />
        {t('signIn')}
      </Link>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-pressed={following}
        className={following ? 'btn-primary' : 'btn-secondary'}
        disabled={pending}
        onClick={() => {
          const next = !following;
          void run(
            () => api(`/api/v1/stores/${storeId}/follow`, { method: next ? 'PUT' : 'DELETE' }),
            () => {
              setFollowing(next);
              setStatus(next ? t('on', { store: storeName }) : t('off', { store: storeName }));
            },
          );
        }}
      >
        <Icon name={following ? 'done' : 'notifications'} />
        {t('button')}
      </button>
      <p role="status" className="muted text-sm">
        {status}
      </p>
      <FormError message={error} />
    </div>
  );
}
