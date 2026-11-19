'use client';

import { GAME_FORMATS } from '@boramarcar/core';
import { toggleIn } from '@boramarcar/ui';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Checkbox } from '../ds/checkbox';
import { Icon } from '../icons';
import { AddressSearch } from '../places/address-search';
import { LocationMap } from '../places/location-map';
import { FormError, useApiAction } from '../use-api-action';

export interface StoreFormValues {
  id: string;
  name: string;
  city: string;
  about: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  formats: string[];
}

/** Perfil da loja (dono e equipe): dados, endereço com mapa, horários, contatos e formatos. */
export function StoreProfileForm({ store }: { store: StoreFormValues }) {
  const t = useTranslations('stores');
  const tf = useTranslations('formats');
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [values, setValues] = useState(store);
  const [status, setStatus] = useState('');
  const set = (patch: Partial<StoreFormValues>) => setValues((v) => ({ ...v, ...patch }));
  const field = (
    key: 'name' | 'city' | 'hours' | 'instagram' | 'whatsapp' | 'website',
    label: string,
    hint?: string,
    max = 200,
  ) => (
    <div>
      <label className="label" htmlFor={`${id}-${key}`}>
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        className="input"
        maxLength={max}
        required={key === 'name' || key === 'city'}
        value={values[key] ?? ''}
        aria-describedby={hint ? `${id}-${key}-hint` : undefined}
        onChange={(e) => set({ [key]: e.target.value })}
      />
      {hint && (
        <p id={`${id}-${key}-hint`} className="muted mt-1 text-sm">
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus('');
        const { id: storeId, ...body } = values;
        void run(
          () => api(`/api/v1/stores/${storeId}`, { method: 'PATCH', body }),
          () => setStatus(t('saved')),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field('name', t('name'), undefined, 80)}
        {field('city', t('city'), undefined, 80)}
      </div>
      <div>
        <label className="label" htmlFor={`${id}-about`}>
          {t('aboutLabel')}
        </label>
        <textarea
          id={`${id}-about`}
          className="input min-h-28 py-2"
          maxLength={2000}
          value={values.about ?? ''}
          aria-describedby={`${id}-about-hint`}
          onChange={(e) => set({ about: e.target.value })}
        />
        <p id={`${id}-about-hint`} className="muted mt-1 text-sm">
          {t('aboutHint')}
        </p>
      </div>
      <div className="space-y-2">
        <AddressSearch
          id={`${id}-address`}
          label={t('address')}
          value={values.address ?? ''}
          near={
            values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null
          }
          onChange={(address) => set({ address })}
          onPick={(s) => set({ address: s.label, lat: s.lat, lng: s.lng })}
        />
        {values.lat !== null && values.lng !== null && (
          <LocationMap
            label={t('where')}
            points={[{ id: 'loja', name: values.name, lat: values.lat, lng: values.lng }]}
            onPick={(p) => set({ lat: p.lat, lng: p.lng })}
          />
        )}
      </div>
      {field('hours', t('hoursLabel'), t('hoursHint'), 300)}
      <div className="grid gap-3 sm:grid-cols-3">
        {field('instagram', t('instagram'), t('instagramHint'))}
        {field('whatsapp', t('whatsapp'), t('whatsappHint'), 40)}
        {field('website', t('website'), t('websiteHint'), 300)}
      </div>
      <fieldset>
        <legend className="label">{t('formatsLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {GAME_FORMATS.map((f) => (
            <Checkbox
              key={f}
              label={tf(f)}
              checked={values.formats.includes(f)}
              onChange={(on) => set({ formats: toggleIn(values.formats, f, on) })}
              className="rounded-xl border border-line-strong px-3 data-[selected]:border-primary data-[selected]:bg-surface-muted"
            />
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          <Icon name="save" />
          {t('save')}
        </button>
        <p role="status" className="muted text-sm">
          {status}
        </p>
      </div>
      <FormError message={error} />
    </form>
  );
}

/** Equipe (só o dono mexe): convidar por e-mail, convites pendentes, tirar alguém, excluir a loja. */
export function StoreTeam({
  storeId,
  isOwner,
  me,
  members,
  invites,
}: {
  storeId: string;
  isOwner: boolean;
  me: string;
  members: { userId: string; name: string; role: string }[];
  invites: { id: string; email: string; expiresAt: string }[];
}) {
  const t = useTranslations('stores');
  const format = useFormatter();
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const danger = (key: string) =>
    confirm === key ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger';

  return (
    <div className="space-y-5">
      <p className="muted">{t('teamHint')}</p>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              <span className="font-medium">{m.name}</span>{' '}
              <span className="muted text-sm">· {t(`role.${m.role as 'owner' | 'staff'}`)}</span>
            </span>
            {isOwner && m.userId !== me && (
              <button
                type="button"
                className={danger(m.userId)}
                disabled={pending}
                onBlur={() => setConfirm(null)}
                onClick={() => {
                  if (confirm !== m.userId) return setConfirm(m.userId);
                  setConfirm(null);
                  void run(() =>
                    api(`/api/v1/stores/${storeId}/members/${m.userId}`, { method: 'DELETE' }),
                  );
                }}
              >
                <Icon name="delete" />
                {confirm === m.userId ? t('removeMemberConfirm') : t('removeMember')}
                <span className="sr-only"> ({m.name})</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setStatus('');
              const sent = email.trim().toLowerCase();
              void run(
                () => api(`/api/v1/stores/${storeId}/invites`, { method: 'POST', body: { email } }),
                () => {
                  setStatus(t('invited', { email: sent }));
                  setEmail('');
                },
              );
            }}
          >
            <div className="min-w-64 flex-1">
              <label className="label" htmlFor={`${id}-invite`}>
                {t('inviteEmail')}
              </label>
              <input
                id={`${id}-invite`}
                className="input"
                type="email"
                required
                maxLength={200}
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn-secondary" disabled={pending}>
              <Icon name="add" />
              {t('invite')}
            </button>
          </form>
          <p role="status" className="muted text-sm">
            {status}
          </p>
          {invites.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">{t('pending')}</h3>
              <ul className="divide-y divide-line">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-sm break-all" data-cs-mask>
                      {t('pendingItem', {
                        email: i.email,
                        date: format.dateTime(new Date(i.expiresAt), { dateStyle: 'medium' }),
                      })}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={pending}
                      onClick={() =>
                        void run(() =>
                          api(`/api/v1/stores/${storeId}/invites/${i.id}`, { method: 'DELETE' }),
                        )
                      }
                    >
                      <Icon name="close" />
                      {t('revoke')}
                      <span className="sr-only"> ({i.email})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-1 border-t border-line pt-4">
            <button
              type="button"
              className={danger('store')}
              disabled={pending}
              onBlur={() => setConfirm(null)}
              onClick={() => {
                if (confirm !== 'store') return setConfirm('store');
                setConfirm(null);
                void run(
                  () => api(`/api/v1/stores/${storeId}`, { method: 'DELETE' }),
                  () => router.push('/painel'),
                );
              }}
            >
              <Icon name="delete" />
              {confirm === 'store' ? t('deleteStoreConfirm') : t('deleteStore')}
            </button>
            <p className="muted text-sm">{t('deleteStoreHint')}</p>
          </div>
        </>
      )}
      <FormError message={error} />
    </div>
  );
}

/** Aceitar o convite de loja (com a sessão da conta convidada). */
export function AcceptStoreInvite({ token }: { token: string }) {
  const t = useTranslations('stores');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          void run(
            () =>
              api<{ store: { slug: string } }>(`/api/v1/store-invites/${token}/accept`, {
                method: 'POST',
              }),
            (r) => router.push(`/lojas/${r.store.slug}/gerenciar`),
          )
        }
      >
        <Icon name="done" />
        {t('accept')}
      </button>
      <FormError message={error} />
    </div>
  );
}
