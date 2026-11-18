'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';
import { Select } from '@/components/ds/select';

export interface AnnouncementRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  groupId: string | null;
  groupName: string | null;
  status: string;
  publishedAt: string | null;
}

/**
 * Avisos do ArcanaKin no `/admin`: escrever um rascunho (para todas as pessoas ou um grupo),
 * editar, excluir e publicar (dois cliques). Publicado vira notificação e não muda mais.
 */
export function AnnouncementsAdmin({
  announcements,
  groups,
}: {
  announcements: AnnouncementRow[];
  groups: { id: string; name: string }[];
}) {
  const t = useTranslations('admin.announcements');
  const format = useFormatter();
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const reset = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setGroupId('');
  };
  const audience = (a: { groupName: string | null }) => a.groupName ?? t('audienceAll');
  const drafts = announcements.filter((a) => a.status === 'draft');
  const published = announcements.filter((a) => a.status === 'published');

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        aria-labelledby={`${id}-form`}
        onSubmit={(e) => {
          e.preventDefault();
          setStatus('');
          const payload = { title, body, groupId: groupId || null };
          void run(
            () =>
              editing
                ? api(`/api/v1/admin/announcements/${editing}`, { method: 'PATCH', body: payload })
                : api('/api/v1/admin/announcements', { method: 'POST', body: payload }),
            () => {
              setStatus(t('saved'));
              reset();
              router.refresh();
            },
          );
        }}
      >
        <h3 id={`${id}-form`} className="font-semibold">
          {editing ? t('editTitle') : t('newTitle')}
        </h3>
        <div>
          <label className="label" htmlFor={`${id}-title`}>
            {t('titleLabel')}
          </label>
          <input
            id={`${id}-title`}
            className="input"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-body`}>
            {t('bodyLabel')}
          </label>
          <textarea
            id={`${id}-body`}
            className="input min-h-32 py-2"
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby={`${id}-body-hint`}
          />
          <p id={`${id}-body-hint`} className="muted mt-1 text-sm">
            {t('bodyHint')}
          </p>
        </div>
        <div>
          <Select
            label={t('audience')}
            id={`${id}-audience`}
            value={String(groupId)}
            onChange={(v) => setGroupId(v)}
            options={[
              { value: '', label: t('audienceAll') },
              ...groups.map((g) => ({ value: String(g.id), label: g.name })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending}>
            <Icon name="save" />
            {editing ? t('update') : t('saveDraft')}
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={reset}>
              {t('cancelEdit')}
            </button>
          )}
        </div>
      </form>
      <p role="status" className="muted text-sm">
        {status}
      </p>
      <FormError message={error} />

      <div>
        <h3 className="mb-2 font-semibold">{t('drafts')}</h3>
        {drafts.length === 0 ? (
          <p className="muted">{t('noDrafts')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {drafts.map((a) => (
              <li key={a.id} className="space-y-2 py-3">
                <p className="font-semibold">
                  {a.title}{' '}
                  <span className="muted text-sm font-normal">
                    · {audience(a)}
                    {a.kind === 'changelog' ? ` · ${t('kindChangelog')}` : ''}
                  </span>
                </p>
                <p className="whitespace-pre-line text-sm">{a.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={
                      confirm === a.id ? 'btn-primary border border-primary' : 'btn-primary'
                    }
                    disabled={pending}
                    onBlur={() => setConfirm(null)}
                    onClick={() => {
                      if (confirm !== a.id) return setConfirm(a.id);
                      setConfirm(null);
                      void run(
                        () =>
                          api<{ recipients: number }>(
                            `/api/v1/admin/announcements/${a.id}/publish`,
                            { method: 'POST' },
                          ),
                        (r) => {
                          setStatus(t('sent', { count: r.recipients }));
                          router.refresh();
                        },
                      );
                    }}
                  >
                    <Icon name="share" />
                    {confirm === a.id
                      ? t('publishConfirm', { audience: audience(a) })
                      : t('publish')}
                    <span className="sr-only"> ({a.title})</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditing(a.id);
                      setTitle(a.title);
                      setBody(a.body);
                      setGroupId(a.groupId ?? '');
                    }}
                  >
                    <Icon name="edit" />
                    {t('edit')}
                    <span className="sr-only"> ({a.title})</span>
                  </button>
                  <button
                    type="button"
                    className={
                      confirm === `del:${a.id}`
                        ? 'btn-danger border border-red-300 dark:border-red-800'
                        : 'btn-danger'
                    }
                    disabled={pending}
                    onBlur={() => setConfirm(null)}
                    onClick={() => {
                      if (confirm !== `del:${a.id}`) return setConfirm(`del:${a.id}`);
                      setConfirm(null);
                      void run(
                        () => api(`/api/v1/admin/announcements/${a.id}`, { method: 'DELETE' }),
                        () => router.refresh(),
                      );
                    }}
                  >
                    <Icon name="delete" />
                    {confirm === `del:${a.id}` ? t('deleteConfirm') : t('delete')}
                    <span className="sr-only"> ({a.title})</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-semibold">{t('published')}</h3>
        {published.length === 0 ? (
          <p className="muted">{t('noPublished')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {published.slice(0, 10).map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-semibold">{a.title}</p>
                <p className="muted text-sm">
                  {audience(a)} ·{' '}
                  {a.publishedAt &&
                    format.dateTime(new Date(a.publishedAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
