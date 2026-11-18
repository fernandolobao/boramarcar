import { isGameFormat } from '@boramarcar/core';
import { listMembers, listTournaments } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icons';
import { getDb } from '@/server/db';
import { requireUserAndGroup } from '@/server/require-group';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tournaments');
  return pageMetadata({
    section: 'group',
    path: '/torneios',
    title: t('title'),
    description: t('metaDescription'),
  });
}

/** Torneios do grupo (9.1): situação, formato e inscrições; dono e admins criam novos. */
export default async function TournamentsPage() {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const [list, members, t, tf] = await Promise.all([
    listTournaments(db, { groupId: group.id, userId: user.id }),
    listMembers(db, group.id),
    getTranslations('tournaments'),
    getTranslations('formats'),
  ]);
  const role = members.find((m) => m.userId === user.id)?.role;
  const canCreate = role === 'owner' || role === 'admin';
  const newLink = canCreate ? (
    <Link href="/torneios/novo" className="btn-primary">
      <Icon name="add" />
      {t('new')}
    </Link>
  ) : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="muted">{t('intro')}</p>
        </div>
        {list.length > 0 && newLink}
      </div>
      {list.length === 0 ? (
        <EmptyState action={newLink}>{t('empty')}</EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {list.map((item) => (
            <li key={item.id}>
              <Link
                href={`/torneios/${item.id}`}
                className="card block space-y-1 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="block text-lg font-semibold">{item.name}</span>
                <span className="muted block text-sm">
                  {tf(isGameFormat(item.format) ? item.format : 'other')} ·{' '}
                  {t('entrantsCount', { count: item.entrants })}
                </span>
                <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium">
                  {t(`status.${item.status as 'registration' | 'running' | 'finished'}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
