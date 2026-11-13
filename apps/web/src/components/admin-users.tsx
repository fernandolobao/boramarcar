'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
  groups: number;
  createdAt: string;
  lastSeenAt: string | null;
}

/** Contas da aplicação no /admin: busca por nome ou e-mail e um cartão por pessoa. */
export function AdminUsers({ users }: { users: AdminUserRow[] }) {
  const t = useTranslations('admin.accounts');
  const format = useFormatter();
  const id = useId();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users;
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const provider = (p: string) =>
    p === 'google' ? t('google') : p === 'credential' ? t('password') : p;

  return (
    <div className="space-y-3">
      <div className="max-w-sm">
        <label className="label" htmlFor={`${id}-q`}>
          {t('search')}
        </label>
        <input
          id={`${id}-q`}
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p role="status" className="muted">
        {t('count', { shown: shown.length, total: users.length })}
      </p>
      <ul className="divide-y divide-line">
        {shown.map((u) => (
          <li key={u.id} className="grid gap-1 py-3 sm:grid-cols-[2fr_3fr] sm:gap-4">
            <div className="min-w-0">
              <p className="font-semibold break-words">{u.name}</p>
              <p className="muted text-sm break-all" data-cs-mask>
                <a href={`mailto:${u.email}`} className="underline underline-offset-2">
                  {u.email}
                </a>
                {!u.emailVerified && (
                  <span className="ms-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg">
                    {t('unverified')}
                  </span>
                )}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="muted text-xs">{t('signIn')}</dt>
                <dd>{u.providers.length ? u.providers.map(provider).join(', ') : '—'}</dd>
              </div>
              <div>
                <dt className="muted text-xs">{t('groups')}</dt>
                <dd className="tabular-nums">{u.groups}</dd>
              </div>
              <div>
                <dt className="muted text-xs">{t('created')}</dt>
                <dd>{date(u.createdAt)}</dd>
              </div>
              <div>
                <dt className="muted text-xs">{t('lastSeen')}</dt>
                <dd>{u.lastSeenAt ? date(u.lastSeenAt) : t('never')}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
