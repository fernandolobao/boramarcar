'use client';

import type { InboxItem } from '@boramarcar/db';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon, type IconName } from './icons';

/** Notificação já serializada (datas em texto) para o cliente. */
export type InboxEntry = Omit<InboxItem, 'createdAt' | 'readAt'> & {
  createdAt: string;
  readAt: string | null;
};

const ICON: Record<InboxEntry['kind'], IconName> = {
  game: 'games',
  group_game: 'group',
  achievement: 'achievement',
  podium: 'ranking',
  announcement: 'info',
};

/** Para onde a notificação leva. */
export function notificationHref(item: InboxEntry): string | null {
  switch (item.data.kind) {
    case 'game':
    case 'group_game':
      return `/eventos/${item.data.eventId}`;
    case 'achievement':
      return '/perfil';
    case 'podium':
      return '/ranking';
    default:
      return null;
  }
}

/** Texto da notificação no idioma de quem lê. */
function useNotificationText() {
  const t = useTranslations('notifications');
  const ta = useTranslations('achievements');
  const format = useFormatter();
  return (item: InboxEntry) => {
    const name = (id: string) => item.people[id] ?? t('someone');
    const list = (ids: string[]) => format.list(ids.map(name), { type: 'conjunction' });
    const event = item.eventTitle ?? '';
    const d = item.data;
    switch (d.kind) {
      case 'game':
        return d.result === 'win'
          ? t('game.win', { event })
          : d.winnerIds.length
            ? t('game.loss', { event, winners: list(d.winnerIds), count: d.winnerIds.length })
            : t('game.draw', { event });
      case 'group_game':
        return d.winnerIds.length
          ? t('group_game', { event, winners: list(d.winnerIds), count: d.winnerIds.length })
          : t('group_game_draw', { event });
      case 'achievement':
        return t('achievement', { name: ta(`items.${d.achievementId}.name`) });
      case 'podium':
        return t('podium', {
          group: item.groupName ?? '',
          podium: d.userIds.map((id, i) => `${i + 1}º ${name(id)}`).join(', '),
        });
      default:
        return item.announcement?.title ?? t('announcement');
    }
  };
}

/**
 * Lista da central de notificações. Cada notificação não lida pode ser marcada como lida (e
 * abrir uma também a marca); "Marcar todas como lidas" fica no topo. O sino do cabeçalho se
 * atualiza em seguida.
 */
export function NotificationList({ items }: { items: InboxEntry[] }) {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const text = useNotificationText();
  const router = useRouter();
  const [read, setRead] = useState<Set<string>>(new Set());
  const isUnread = (item: InboxEntry) => !item.readAt && !read.has(item.id);
  const unread = items.filter(isUnread);

  const markOne = (item: InboxEntry) => {
    if (!isUnread(item)) return;
    setRead((prev) => new Set(prev).add(item.id));
    // `keepalive`: continua mesmo se a pessoa sair da página ao abrir a notificação.
    void fetch(`/api/v1/me/notifications/${item.id}/read`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
    })
      .then(() => router.refresh())
      .catch(() => {});
  };
  const markAll = () => {
    setRead(new Set(items.map((i) => i.id)));
    void api('/api/v1/me/notifications/read', { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => {});
  };

  if (!items.length) return <p className="muted">{t('empty')}</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="muted text-sm">
          {t('unreadCount', { count: unread.length })}
        </p>
        {unread.length > 0 && (
          <button type="button" className="btn-secondary" onClick={markAll}>
            <Icon name="done" />
            {t('markAll')}
          </button>
        )}
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const href = notificationHref(item);
          const fresh = isUnread(item);
          const body = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted">
                <Icon name={ICON[item.kind]} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${item.announcement ? 'font-semibold' : ''}`}>
                  {text(item)}
                </span>
                {item.announcement && (
                  // Texto simples do aviso, com as quebras de linha que o admin escreveu.
                  <span className="block whitespace-pre-line">{item.announcement.body}</span>
                )}
                <span className="muted block text-sm">
                  {item.groupName && item.kind !== 'podium' ? `${item.groupName} · ` : ''}
                  <time dateTime={item.createdAt}>
                    {format.relativeTime(new Date(item.createdAt), now)}
                  </time>
                </span>
              </span>
              {fresh && (
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
                  {t('new')}
                </span>
              )}
            </>
          );
          return (
            <li key={item.id} className="flex items-start gap-2 py-1">
              {href ? (
                <Link
                  href={href}
                  onClick={() => markOne(item)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3 px-2 py-2">{body}</div>
              )}
              {fresh && (
                <button
                  type="button"
                  className="btn-secondary mt-1 shrink-0 px-3"
                  onClick={() => markOne(item)}
                  aria-label={t('markOneLabel', { text: text(item) })}
                  title={t('markOne')}
                >
                  <Icon name="done" />
                  <span className="sr-only sm:not-sr-only">{t('markOne')}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
