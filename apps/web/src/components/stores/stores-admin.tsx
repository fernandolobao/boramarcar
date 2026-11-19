'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Switch } from '../ds/switch';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

export interface AdminStoreRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  contactEmail: string;
  verified: boolean;
  members: number;
}

/** Lojas no `/admin` (10.1): criar (com o convite de dono por e-mail), selo de verificada e excluir. */
export function StoresAdmin({ stores }: { stores: AdminStoreRow[] }) {
  const t = useTranslations('stores.admin');
  const ts = useTranslations('stores');
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <p className="muted">{t('intro')}</p>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setStatus('');
          void run(
            () => api('/api/v1/admin/stores', { method: 'POST', body: { name, city, email } }),
            () => {
              setStatus(t('created', { email: email.trim().toLowerCase() }));
              setName('');
              setCity('');
              setEmail('');
            },
          );
        }}
      >
        <div>
          <label className="label" htmlFor={`${id}-name`}>
            {ts('name')}
          </label>
          <input
            id={`${id}-name`}
            className="input"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-city`}>
            {ts('city')}
          </label>
          <input
            id={`${id}-city`}
            className="input"
            required
            maxLength={80}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-email`}>
            {t('contactEmail')}
          </label>
          <input
            id={`${id}-email`}
            className="input"
            type="email"
            required
            maxLength={200}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <button className="btn-primary" disabled={pending}>
            <Icon name="add" />
            {t('create')}
          </button>
        </div>
      </form>
      <p role="status" className="muted text-sm">
        {status}
      </p>
      <FormError message={error} />

      {stores.length === 0 ? (
        <p className="muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {stores.map((s) => (
            <li key={s.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-semibold">
                  <Link href={`/lojas/${s.slug}`} className="underline underline-offset-2">
                    {s.name}
                  </Link>{' '}
                  <span className="muted text-sm font-normal">· {s.city}</span>
                </p>
                <p className="muted text-sm break-all" data-cs-mask>
                  {s.contactEmail} · {t('members', { count: s.members })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Switch
                  label={t('verifiedOf', { name: s.name })}
                  checked={s.verified}
                  disabled={pending}
                  onChange={(verified) =>
                    void run(() =>
                      api(`/api/v1/admin/stores/${s.id}`, { method: 'PATCH', body: { verified } }),
                    )
                  }
                />
                <button
                  type="button"
                  className={
                    confirm === s.id
                      ? 'btn-danger border border-red-300 dark:border-red-800'
                      : 'btn-danger'
                  }
                  disabled={pending}
                  onBlur={() => setConfirm(null)}
                  onClick={() => {
                    if (confirm !== s.id) return setConfirm(s.id);
                    setConfirm(null);
                    void run(() => api(`/api/v1/admin/stores/${s.id}`, { method: 'DELETE' }));
                  }}
                  aria-label={`${confirm === s.id ? t('deleteConfirm') : t('delete')} (${s.name})`}
                >
                  <Icon name="delete" />
                  {confirm === s.id ? t('deleteConfirm') : t('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
