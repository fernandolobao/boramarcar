'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

const MAX = 280;

/**
 * "Quem segue a loja" em "Gerenciar a loja" (10.4): quantas pessoas seguem (nunca quem), o aviso
 * para quem segue (até 280 caracteres, 3 por semana) e os últimos avisos.
 */
export function StoreFollowersSection({
  storeId,
  count,
  notices,
}: {
  storeId: string;
  count: number;
  notices: { id: string; text: string; createdAt: string }[];
}) {
  const t = useTranslations('stores.followers');
  const format = useFormatter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  return (
    <div className="space-y-4">
      <p className="font-medium">{t('count', { count })}</p>
      <p className="muted text-sm">{t('hint')}</p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setStatus('');
          void run(
            () =>
              api<{ notified: number }>(`/api/v1/stores/${storeId}/notices`, {
                method: 'POST',
                body: { text },
              }),
            (r) => {
              setStatus(t('sent', { count: r.notified }));
              setText('');
            },
          );
        }}
      >
        <label className="label" htmlFor={`${id}-aviso`}>
          {t('noticeLabel')}
        </label>
        <textarea
          id={`${id}-aviso`}
          className="input min-h-24 py-2"
          maxLength={MAX}
          required
          value={text}
          aria-describedby={`${id}-dica ${id}-resta`}
          onChange={(e) => setText(e.target.value)}
        />
        <p id={`${id}-dica`} className="muted text-sm">
          {t('noticeHint')}
        </p>
        <p id={`${id}-resta`} className="muted text-xs">
          {t('remaining', { count: MAX - text.length })}
        </p>
        <button className="btn-primary" disabled={pending || !text.trim()}>
          <Icon name="notifications" />
          {t('send')}
        </button>
        <p role="status" className="text-sm">
          {status}
        </p>
        <FormError message={error} />
      </form>
      {notices.length > 0 && (
        <div>
          <h3 className="font-semibold">{t('recent')}</h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {notices.map((n) => (
              <li key={n.id} className="py-2">
                <span className="muted">
                  {format.dateTime(new Date(n.createdAt), { dateStyle: 'medium' })} ·{' '}
                </span>
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
