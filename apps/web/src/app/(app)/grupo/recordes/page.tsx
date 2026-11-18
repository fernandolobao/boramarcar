import type { Metadata } from 'next';
import { getGroupRecords } from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/empty-state';
import { Icon, type IconName } from '@/components/icons';
import { ManaSymbol } from '@/components/mana';
import { PlayerLinks } from '@/components/player-link';
import { getDb } from '@/server/db';
import { requireUserAndGroup } from '@/server/require-group';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('records');
  return pageMetadata({
    section: 'group',
    path: '/grupo/recordes',
    title: t('title'),
    description: t('metaDescription'),
  });
}

const COLOR_KEYS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;

/** Recordes e "cara do grupo" (8.12): só para quem é do grupo. */
export default async function GroupRecordsPage() {
  const { user, group } = await requireUserAndGroup();
  const view = await getGroupRecords(getDb(), { groupId: group.id, userId: user.id });
  const t = await getTranslations('records');
  const format = await getFormatter();
  const { records, face, people, eventTitles } = view;
  const day = (d: Date) => format.dateTime(d, { dateStyle: 'medium' });
  const person = (id: string) => ({ userId: id, name: people[id] ?? t('someone') });
  const event = (id: string) => (
    <Link href={`/eventos/${id}`} className="underline underline-offset-2">
      {eventTitles[id] ?? t('event')}
    </Link>
  );

  const items: { key: string; icon: IconName; title: string; body: React.ReactNode }[] = [];
  if (records.fastestWin) {
    const r = records.fastestWin;
    items.push({
      key: 'fastest',
      icon: 'fastWin',
      title: t('fastestWin.title'),
      body: t.rich('fastestWin.body', {
        turn: r.turn,
        count: r.winnerIds.length,
        date: day(r.playedAt),
        who: () => <PlayerLinks players={r.winnerIds.map(person)} lastSeparator={t('and')} />,
        event: () => event(r.eventId),
      }),
    });
  }
  if (records.longestGame) {
    const r = records.longestGame;
    items.push({
      key: 'longest',
      icon: 'availability',
      title: t('longestGame.title'),
      body: t.rich('longestGame.body', {
        minutes: r.minutes,
        date: day(r.playedAt),
        event: () => event(r.eventId),
      }),
    });
  }
  if (records.longestStreak) {
    const r = records.longestStreak;
    items.push({
      key: 'streak',
      icon: 'streak',
      title: t('longestStreak.title'),
      body: t.rich('longestStreak.body', {
        length: r.length,
        date: day(r.playedAt),
        who: () => <PlayerLinks players={[person(r.userId)]} />,
        event: () => event(r.eventId),
      }),
    });
  }
  if (records.busiestNight) {
    const r = records.busiestNight;
    items.push({
      key: 'night',
      icon: 'events',
      title: t('busiestNight.title'),
      body: t.rich('busiestNight.body', {
        games: r.games,
        date: day(r.playedAt),
        event: () => event(r.eventId),
      }),
    });
  }
  if (records.topCommander) {
    items.push({
      key: 'commander',
      icon: 'champion',
      title: t('topCommander.title'),
      body: t('topCommander.body', {
        name: records.topCommander.name,
        wins: records.topCommander.wins,
      }),
    });
  }
  const colorTotal = COLOR_KEYS.reduce((sum, c) => sum + face.colors[c], 0);

  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">{t('intro', { group: group.name })}</p>
      </div>
      {view.totalGames === 0 ? (
        <EmptyState>
          <p>{t('empty')}</p>
        </EmptyState>
      ) : (
        <>
          <section className="card space-y-4" aria-labelledby="recordes-lista">
            <h2 id="recordes-lista" className="section-title mb-0">
              {t('recordsTitle')}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 rounded-xl border border-line p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                    <Icon name={item.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-4" aria-labelledby="recordes-cara">
            <h2 id="recordes-cara" className="section-title mb-0">
              {t('faceTitle')}
            </h2>
            <p className="muted text-sm">{t('faceHint')}</p>
            {colorTotal > 0 && (
              <ul className="flex flex-wrap gap-3" aria-label={t('colorsLabel')}>
                {COLOR_KEYS.filter((c) => face.colors[c] > 0).map((c) => (
                  <li
                    key={c}
                    className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-sm"
                  >
                    <ManaSymbol symbol={c} />
                    <span>
                      {t(`colors.${c}`)}:{' '}
                      <strong className="tabular-nums">
                        {format.number(face.colors[c] / colorTotal, {
                          style: 'percent',
                          maximumFractionDigits: 0,
                        })}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p>{t('commanders', { count: face.commanders })}</p>
            {face.meta.length > 0 && (
              <div>
                <h3 className="font-semibold">{t('metaTitle', { days: 90 })}</h3>
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm">
                  {face.meta.map((m) => (
                    <li key={m.name}>
                      {m.name} <span className="muted">· {t('metaGames', { count: m.games })}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
