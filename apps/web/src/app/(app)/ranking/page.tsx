import { isGameFormat, resolvePeriod } from '@boramarcar/core';
import { getGroupRanking, getGroupStats, listSeasons } from '@boramarcar/db';
import Image from 'next/image';
import Link from 'next/link';
import { getFormatter, getTimeZone, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { DeleteButton } from '@/components/availability-forms';
import { Icon } from '@/components/icons';
import { SeasonForm } from '@/components/season-form';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('ranking');

type Props = { searchParams: Promise<{ periodo?: string; tipo?: string }> };

/** Tabela larga que rola sozinha no celular, alcançável por teclado (WCAG 2.1.1). */
function ScrollTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco pelo teclado
    <div role="region" aria-label={label} tabIndex={0} className="-mx-1 overflow-x-auto px-1">
      {children}
    </div>
  );
}

const Art = ({ src }: { src: string | null }) => (
  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
    {src && <Image src={src} alt="" fill sizes="64px" unoptimized className="object-cover" />}
  </div>
);

export default async function RankingPage({ searchParams }: Props) {
  const { user, group } = await requireUserAndGroup();
  const params = await searchParams;
  const db = getDb();
  const timeZone = await getTimeZone();
  const seasons = await listSeasons(db, { groupId: group.id, userId: user.id });
  const range = resolvePeriod(params.periodo, { now: new Date(), timeZone, seasons });
  const formatFilter = isGameFormat(params.tipo) ? params.tipo : undefined;
  const filter = {
    groupId: group.id,
    userId: user.id,
    from: range.from,
    to: range.to,
    format: formatFilter,
  };
  const [ranking, stats] = await Promise.all([
    getGroupRanking(db, filter),
    getGroupStats(db, filter),
  ]);

  const t = await getTranslations('ranking');
  const ts = await getTranslations('ranking.stats');
  const tsn = await getTranslations('ranking.seasons');
  const tf = await getTranslations('formats');
  const format = await getFormatter();
  const percent = (value: number) => format.number(value, { style: 'percent' });
  const canManage = group.role !== 'member';

  const periodLabel = range.season
    ? t('seasonOption', { name: range.season.name })
    : t(`periods.${range.period as 'all' | 'last30' | 'thisYear'}`);
  const formatLabel = formatFilter ? tf(formatFilter) : t('allFormats');
  const people = stats.players.map((p) => ({ userId: p.userId, name: p.name }));
  const pair = (a: string, b: string) =>
    stats.headToHead.find((h) => h.userId === a && h.opponentId === b);
  const hasDetails =
    stats.averageWinningTurn !== null ||
    stats.averageDurationMinutes !== null ||
    stats.firstPlayerWinRate !== null;

  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">
          {t('totalGames', { count: ranking.totalGames })} ·{' '}
          {t('pointsRule', { ...ranking.points })}
        </p>
      </div>

      <form
        method="get"
        className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        aria-label={t('filters')}
      >
        <div>
          <label className="label" htmlFor="filtro-periodo">
            {t('period')}
          </label>
          <select id="filtro-periodo" name="periodo" className="select" defaultValue={range.period}>
            <option value="all">{t('periods.all')}</option>
            <option value="last30">{t('periods.last30')}</option>
            <option value="thisYear">{t('periods.thisYear')}</option>
            {seasons.map((s) => (
              <option key={s.id} value={`season:${s.id}`}>
                {t('seasonOption', { name: s.name })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filtro-tipo">
            {t('formatFilter')}
          </label>
          <select id="filtro-tipo" name="tipo" className="select" defaultValue={formatFilter ?? ''}>
            <option value="">{t('allFormats')}</option>
            {stats.formats.filter(isGameFormat).map((f) => (
              <option key={f} value={f}>
                {tf(f)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary">
          <Icon name="filter" />
          {t('apply')}
        </button>
        <p className="muted text-sm sm:col-span-3" aria-live="polite">
          {t('showing', { period: periodLabel, format: formatLabel })}
        </p>
      </form>

      <section className="card" aria-labelledby="standings-title">
        <h2 id="standings-title" className="section-title">
          {t('standings')}
        </h2>
        {ranking.standings.length === 0 ? (
          <p className="muted">{t('empty')}</p>
        ) : (
          <ScrollTable label={t('standings')}>
            <table className="w-full text-sm">
              <caption className="sr-only">{t('caption', { group: group.name })}</caption>
              <thead>
                <tr className="text-left text-zinc-600 dark:text-zinc-400">
                  <th scope="col" className="py-2 pr-2">
                    {t('position')}
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    {t('player')}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t('games')}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t('wins')}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t('losses')}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t('draws')}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t('winRate')}
                  </th>
                  <th scope="col" className="py-2 text-right">
                    {t('points')}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {ranking.standings.map((s) => (
                  <tr
                    key={s.userId}
                    className={`border-t border-zinc-200 dark:border-zinc-800 ${s.userId === user.id ? 'font-semibold' : ''}`}
                  >
                    <td className="py-2 pr-2">{s.position}</td>
                    <th scope="row" className="py-2 pr-2 text-left font-[inherit]">
                      {s.name}
                    </th>
                    <td className="py-2 pr-2 text-right">{s.games}</td>
                    <td className="py-2 pr-2 text-right">{s.wins}</td>
                    <td className="py-2 pr-2 text-right">{s.losses}</td>
                    <td className="py-2 pr-2 text-right">{s.draws}</td>
                    <td className="py-2 pr-2 text-right">{percent(s.winRate)}</td>
                    <td className="py-2 text-right font-semibold">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        )}
      </section>

      <section className="space-y-6" aria-labelledby="stats-title">
        <h2 id="stats-title" className="section-title">
          {ts('title')}
        </h2>
        {stats.totalGames === 0 ? (
          <p className="muted">{ts('empty')}</p>
        ) : (
          <>
            <div className="card">
              <h3 className="font-semibold">{ts('highlights')}</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  [
                    ts('averageTurn'),
                    stats.averageWinningTurn === null
                      ? ts('noData')
                      : format.number(stats.averageWinningTurn, { maximumFractionDigits: 1 }),
                  ],
                  [
                    ts('averageDuration'),
                    stats.averageDurationMinutes === null
                      ? ts('noData')
                      : ts('minutes', { value: Math.round(stats.averageDurationMinutes) }),
                  ],
                  [
                    ts('firstWinRate'),
                    stats.firstPlayerWinRate === null
                      ? ts('noData')
                      : ts('firstWinRateValue', {
                          rate: percent(stats.firstPlayerWinRate),
                          count: stats.firstPlayerSample,
                        }),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                    <dt className="muted text-sm">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {!hasDetails && <p className="muted mt-3 text-sm">{ts('detailsHint')}</p>}
              {stats.winsBySeat.length > 0 && (
                <>
                  <h4 className="mt-4 text-sm font-semibold">{ts('seats')}</h4>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                    {stats.winsBySeat.map((s) => (
                      <li key={s.seat}>
                        {ts('seat', { seat: s.seat })}:{' '}
                        <span className="font-medium">
                          {ts('seatValue', { wins: s.wins, games: s.games })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold">{ts('streaks')}</h3>
              <ScrollTable label={ts('streaks')}>
                <table className="mt-2 w-full text-sm">
                  <caption className="sr-only">{ts('streaksCaption')}</caption>
                  <thead>
                    <tr className="text-left text-zinc-600 dark:text-zinc-400">
                      <th scope="col" className="py-2 pr-2">
                        {t('player')}
                      </th>
                      <th scope="col" className="py-2 pr-2 text-right">
                        {ts('currentStreak')}
                      </th>
                      <th scope="col" className="py-2 pr-2 text-right">
                        {ts('bestStreak')}
                      </th>
                      <th scope="col" className="py-2 pr-2 text-right">
                        {ts('wentFirst')}
                      </th>
                      <th scope="col" className="py-2 text-right">
                        {ts('firstOut')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {stats.players.map((p) => (
                      <tr key={p.userId} className="border-t border-zinc-200 dark:border-zinc-800">
                        <th scope="row" className="py-2 pr-2 text-left font-medium">
                          {p.name}
                        </th>
                        <td className="py-2 pr-2 text-right">{p.currentStreak}</td>
                        <td className="py-2 pr-2 text-right">{p.bestStreak}</td>
                        <td className="py-2 pr-2 text-right">
                          {ts('wentFirstValue', { games: p.gamesFirst, wins: p.winsFirst })}
                        </td>
                        <td className="py-2 text-right">{p.firstOut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollTable>
            </div>

            {people.length > 1 && (
              <div className="card">
                <h3 className="font-semibold">{ts('headToHead')}</h3>
                <p id="h2h-hint" className="muted mt-1 text-sm">
                  {ts('headToHeadHint')}
                </p>
                <ScrollTable label={ts('headToHead')}>
                  <table className="mt-2 text-sm" aria-describedby="h2h-hint">
                    <caption className="sr-only">{ts('headToHeadCaption')}</caption>
                    <thead>
                      <tr className="text-zinc-600 dark:text-zinc-400">
                        <td />
                        {people.map((o) => (
                          <th key={o.userId} scope="col" className="px-2 py-2 text-center">
                            {o.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {people.map((p) => (
                        <tr
                          key={p.userId}
                          className="border-t border-zinc-200 dark:border-zinc-800"
                        >
                          <th
                            scope="row"
                            className="py-2 pr-3 text-left font-medium whitespace-nowrap"
                          >
                            {p.name}
                          </th>
                          {people.map((o) => {
                            const h = p.userId === o.userId ? null : pair(p.userId, o.userId);
                            return (
                              <td
                                key={o.userId}
                                className="px-2 py-2 text-center whitespace-nowrap"
                              >
                                {h ? (
                                  <span
                                    title={ts('headToHeadCellLabel', {
                                      name: p.name,
                                      opponent: o.name,
                                      wins: h.wins,
                                      losses: h.losses,
                                      games: h.games,
                                    })}
                                  >
                                    {ts('headToHeadCell', { wins: h.wins, losses: h.losses })}
                                  </span>
                                ) : (
                                  <span aria-hidden="true">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <h3 className="font-semibold">{ts('decks')}</h3>
                {stats.decks.length === 0 ? (
                  <p className="muted mt-2 text-sm">{ts('noDecks')}</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {stats.decks.slice(0, 10).map((d) => (
                      <li key={d.deckId} className="flex items-center gap-3">
                        <Art src={d.cover?.artUri ?? null} />
                        <div className="min-w-0 text-sm">
                          <Link
                            href={`/decks/${d.deckId}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {d.name}
                          </Link>
                          <p className="muted">
                            {ts('deckLine', {
                              owner: d.ownerName,
                              games: d.games,
                              wins: d.wins,
                              rate: percent(d.winRate),
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="card">
                <h3 className="font-semibold">{ts('commanders')}</h3>
                {stats.commanders.length === 0 ? (
                  <p className="muted mt-2 text-sm">{ts('noDecks')}</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {stats.commanders.slice(0, 10).map((c) => (
                      <li key={c.name} className="flex items-center gap-3">
                        <Art src={c.artUri} />
                        <div className="min-w-0 text-sm">
                          <p className="font-medium">{c.name}</p>
                          <p className="muted">
                            {ts('commanderLine', {
                              players: c.players.join(', '),
                              games: c.games,
                              rate: percent(c.winRate),
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card space-y-4" aria-labelledby="seasons-title">
        <div>
          <h2 id="seasons-title" className="section-title">
            {tsn('title')}
          </h2>
          <p className="muted text-sm">{tsn('hint')}</p>
        </div>
        {seasons.length === 0 ? (
          <p className="muted text-sm">{tsn('empty')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {seasons.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link
                    href={`/ranking?periodo=season:${s.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {s.name}
                  </Link>{' '}
                  <span className="muted">
                    ·{' '}
                    {tsn('range', {
                      start: format.dateTime(s.startsAt, { dateStyle: 'medium' }),
                      end: format.dateTime(new Date(s.endsAt.getTime() - 1), {
                        dateStyle: 'medium',
                      }),
                    })}
                  </span>
                </span>
                {canManage && (
                  <DeleteButton
                    path={`/api/v1/seasons/${s.id}`}
                    context={tsn('remove', { name: s.name })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && <SeasonForm groupId={group.id} />}
      </section>
    </>
  );
}
