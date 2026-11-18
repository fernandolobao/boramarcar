'use client';

import type { InboxItem } from '@boramarcar/db';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';
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
        return t('announcement');
    }
  };
}

/**
 * Lista da central de notificações. Ao abrir, tudo passa a contar como lido (o selo "Nova"
 * continua nesta visita, para a pessoa ver o que chegou).
 */
export function NotificationList({ items }: { items: InboxEntry[] }) {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const text = useNotificationText();
  const hasUnread = items.some((i) => !i.readAt);

  useEffect(() => {
    if (hasUnread) void api('/api/v1/me/notifications/read', { method: 'POST' }).catch(() => {});
  }, [hasUnread]);

  if (!items.length) return <p className="muted">{t('empty')}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const href = notificationHref(item);
        const body = (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted">
              <Icon name={ICON[item.kind]} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">{text(item)}</span>
              <span className="muted block text-sm">
                {item.groupName && item.kind !== 'podium' ? `${item.groupName} · ` : ''}
                <time dateTime={item.createdAt}>
                  {format.relativeTime(new Date(item.createdAt), now)}
                </time>
              </span>
            </span>
            {!item.readAt && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
                {t('new')}
              </span>
            )}
          </>
        );
        return (
          <li key={item.id}>
            {href ? (
              <Link
                href={href}
                className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-surface-muted"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-2 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
