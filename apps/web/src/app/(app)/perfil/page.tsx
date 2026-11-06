import { getUserSummary } from '@boramarcar/db';
import Image from 'next/image';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('profile');

export default async function ProfilePage() {
  const user = await requireUser();
  const summary = await getUserSummary(getDb(), user.id);
  const t = await getTranslations('profilePage');
  const tg = await getTranslations('group');
  const format = await getFormatter();
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-700 dark:text-white">
          {user.image ? (
            <Image src={user.image} alt="" fill sizes="80px" unoptimized className="object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="page-title">{user.name}</h1>
          <p className="muted break-all">{user.email}</p>
          <p className="muted text-sm">
            {t('memberSince', {
              date: format.dateTime(summary.memberSince, { month: 'long', year: 'numeric' }),
            })}
          </p>
        </div>
        <Link href="/configuracoes" className="btn-secondary ms-auto">
          <Icon name="settings" />
          {t('editSettings')}
        </Link>
      </div>

      <section className="card" aria-labelledby="profile-summary">
        <h2 id="profile-summary" className="section-title">
          {t('summary')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t('games'), format.number(summary.games)],
            [t('wins'), format.number(summary.wins)],
            [t('winRate'), format.number(summary.winRate, { style: 'percent' })],
            [t('decks'), format.number(summary.decks)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
              <dt className="muted text-sm">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {summary.groups.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">
              {t('groups', { count: summary.groups.length })}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {summary.groups.map((g) => (
                <li key={g.id} className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                  {g.name} · <span className="muted">{tg(`roles.${g.role}`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="profile-achievements">
        <h2 id="profile-achievements" className="section-title">
          {t('achievements')}
        </h2>
        <p className="muted">{t('achievementsSoon')}</p>
      </section>
    </>
  );
}
