'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

export function CreateGroupForm() {
  const t = useTranslations('group');
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () => api('/api/v1/groups', { method: 'POST', body: { name } }),
          () => setName(''),
        );
      }}
    >
      <label className="label" htmlFor="group-name">
        {t('name')}
      </label>
      <input
        id="group-name"
        className="input"
        required
        minLength={2}
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="btn-primary" disabled={pending}>
        <Icon name="add" />
        {t('create')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function JoinGroupForm() {
  const t = useTranslations('group');
  const { run, error, pending } = useApiAction();
  const [code, setCode] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () => api('/api/v1/groups/join', { method: 'POST', body: { inviteCode: code } }),
          () => setCode(''),
        );
      }}
    >
      <label className="label" htmlFor="invite-code">
        {t('inviteCode')}
      </label>
      <input
        id="invite-code"
        className="input font-mono uppercase"
        required
        minLength={4}
        maxLength={16}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn-secondary" disabled={pending}>
        <Icon name="join" />
        {t('join')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function LocationForm({ groupId }: { groupId: string }) {
  const t = useTranslations('group');
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            api(`/api/v1/groups/${groupId}/locations`, {
              method: 'POST',
              body: { name, address: address || null },
            }),
          () => {
            setName('');
            setAddress('');
          },
        );
      }}
    >
      <div>
        <label className="label" htmlFor="location-name">
          {t('locationName')}
        </label>
        <input
          id="location-name"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="location-address">
          {t('address')}
        </label>
        <input
          id="location-address"
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <button className="btn-secondary" disabled={pending}>
        <Icon name="add" />
        {t('addLocation')}
      </button>
      <FormError message={error} />
    </form>
  );
}

export function SwitchGroupButton({ groupId }: { groupId: string }) {
  const t = useTranslations('group');
  const { run, pending } = useApiAction();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        void run(() => api('/api/v1/me/active-group', { method: 'PUT', body: { groupId } }))
      }
    >
      <Icon name="switchGroup" />
      {t('switch')}
    </button>
  );
}
