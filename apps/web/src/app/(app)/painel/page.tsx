import { getGroupRanking, listEvents, suggestGameWindows } from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('dashboard');

const DAY = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const now = new Date();
  const [events, windows, ranking] = await Promise.all([
    listEvents(db, { groupId: group.id, userId: user.id, when: 'upcoming', now }),
    suggestGameWindows(db, {
      groupId: group.id,
      userId: user.id,
      from: now,
      to: new Date(now.getTime() + 21 * DAY),
    }),
    getGroupRanking(db, { groupId: group.id, userId: user.id }),
  ]);
  const t = await getTranslations('dashboard');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const tr = await getTranslations('ranking');
  const format = await getFormatter();

  return (
    <>
      <h1 className="page-title">{t('hello', { name: user.name.split(' ')[0] ?? user.name })}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">{t('nextEvents')}</h2>
          {events.length === 0 ? (
            <p className="muted">{t('noEvents')}</p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/eventos/${event.id}`}
                    className="block rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <p className="font-medium">{event.title}</p>
                    <p className="muted">
                      {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
                      {event.locationName ?? tc('locationTbd')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="section-title">{t('bestWindows')}</h2>
          {windows.length === 0 ? (
            <p className="muted">{t('noWindows')}</p>
          ) : (
            <ul className="space-y-2">
              {windows.slice(0, 3).map((w) => (
                <li key={`${w.start.toISOString()}-${w.locationId}`} className="rounded-xl p-2">
                  <p className="font-medium">
                    {format.dateTimeRange(w.start, w.end, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="muted">
                    {w.locationName ?? tc('locationTbd')} ·{' '}
                    {tc('players', { count: w.players.length })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/disponibilidade" className="btn-secondary mt-4">
            {tn('availability')}
          </Link>
        </section>
        <section className="card md:col-span-2">
          <h2 className="section-title">{t('topPlayers')}</h2>
          <ol className="grid gap-2 sm:grid-cols-3">
            {ranking.standings.slice(0, 3).map((s) => (
              <li key={s.userId} className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
                <span className="text-2xl font-bold">{s.position}º</span>{' '}
                <span className="font-medium">{s.name}</span>
                <p className="muted">
                  {s.points} {tr('points')} · {s.wins}
                  {tr('wins')} {s.losses}
                  {tr('losses')} {s.draws}
                  {tr('draws')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
