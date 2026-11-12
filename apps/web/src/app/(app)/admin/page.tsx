import { BETA_WEEKS } from '@boramarcar/core';
import {
  getBeta,
  getBetaGroupStats,
  getProductMetrics,
  listGroupsForBeta,
  listRecentFeedback,
} from '@boramarcar/db';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { requireAdmin } from '@/server/admin';
import { BetaControl } from '@/components/beta-control';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('admin'))('title'), robots: { index: false } };
}

/** Métricas do beta (8.3) e feedback recente (8.4), só para ADMIN_EMAILS. */
export default async function AdminPage() {
  await requireAdmin();
  const db = getDb();
  const now = new Date();
  const [m, recent, beta, betaGroups] = await Promise.all([
    getProductMetrics(db, now),
    listRecentFeedback(db, 30),
    getBeta(db, now),
    listGroupsForBeta(db),
  ]);
  const betaStats = await getBetaGroupStats(db, beta.state, now);
  const t = await getTranslations('admin');
  const tb = await getTranslations('admin.beta');
  const tf = await getTranslations('feedback');
  const format = await getFormatter();

  const sections: { title: string; rows: [string, string | number][] }[] = [
    {
      title: t('activation'),
      rows: [
        [t('newGroups'), m.newGroups.count],
        [t('withThree'), m.newGroups.withThreeMembers],
        [t('withEvent'), m.newGroups.withEvent],
        [t('invites'), m.invites.joins],
      ],
    },
    {
      title: t('events'),
      rows: [
        [t('held'), m.events.held],
        [t('tableFilled'), m.events.tableFilled],
        [t('withGame'), m.events.withGame],
        [
          t('deckLinked'),
          t('deckLinkedValue', { withDeck: m.games.withDeck, slots: m.games.playerSlots }),
        ],
      ],
    },
    {
      title: t('people'),
      rows: [
        [t('users'), m.users.total],
        [t('newUsers'), m.users.new],
        [t('withAvailability'), m.users.withAvailability],
        [t('decks'), m.decks.new],
      ],
    },
  ];

  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted max-w-2xl">{t('intro', { days: m.windowDays })}</p>
      </div>

      <section className="card space-y-2" aria-labelledby="admin-norte">
        <h2 id="admin-norte" className="section-title mb-0">
          {t('northStar')}
        </h2>
        <p className="font-display text-5xl font-semibold tabular-nums">{m.activeGroups}</p>
        <p>
          {t('activeGroups')} · {t('ofGroups', { total: m.totalGroups })}
        </p>
        <p className="muted">
          {t('retention')}:{' '}
          {t('retentionValue', { retained: m.retention.retained, previous: m.retention.previous })}
        </p>
      </section>

      <section className="card space-y-4" aria-labelledby="admin-beta">
        <div>
          <h2 id="admin-beta" className="section-title mb-1">
            {tb('title')}
          </h2>
          <p data-testid="beta-status">
            {tb(`phase.${beta.state.phase}`, {
              start: beta.state.startsAt
                ? format.dateTime(beta.state.startsAt, { dateStyle: 'long' })
                : '',
              end: beta.state.endsAt
                ? format.dateTime(beta.state.endsAt, { dateStyle: 'long' })
                : '',
              week: beta.state.week ?? 0,
              weeks: BETA_WEEKS,
            })}
          </p>
          <p className="muted">{tb('intro', { weeks: BETA_WEEKS })}</p>
        </div>
        <BetaControl
          phase={beta.state.phase}
          startsAt={beta.state.startsAt?.toISOString() ?? null}
          groups={betaGroups}
        />
        {betaStats.length > 0 && (
          <div>
            <table className="w-full text-xs sm:text-sm">
              <caption className="mb-2 text-left font-semibold">{tb('statsCaption')}</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="py-2 pr-3">
                    {tb('cols.group')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    {tb('cols.members')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    {tb('cols.events')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    {tb('cols.games')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {tb('cols.lastGame')}
                  </th>
                  <th scope="col" className="py-2">
                    {tb('cols.welcome')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {betaStats.map((g) => (
                  <tr key={g.id} className="border-t border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      {g.name}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.members}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.eventsHeld}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.games}</td>
                    <td className="py-2 pr-3">
                      {g.lastGameAt
                        ? format.dateTime(g.lastGameAt, { dateStyle: 'medium' })
                        : tb('never')}
                    </td>
                    <td className="py-2">
                      {g.welcomed ? tb('welcomeSent') : tb('welcomePending')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {sections.map((section, i) => (
          <section key={section.title} className="card" aria-labelledby={`admin-s${i}`}>
            <h2 id={`admin-s${i}`} className="section-title">
              {section.title}
            </h2>
            <table className="w-full text-sm">
              <caption className="sr-only">{section.title}</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t('metric')}</th>
                  <th scope="col">{t('value')}</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map(([label, value]) => (
                  <tr key={label} className="border-t border-line first:border-0">
                    <th scope="row" className="py-2 pr-2 text-left font-normal">
                      {label}
                    </th>
                    <td className="py-2 text-right font-semibold tabular-nums">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <section className="card space-y-3" aria-labelledby="admin-feedback">
        <div>
          <h2 id="admin-feedback" className="section-title mb-0">
            {t('feedback')}
          </h2>
          <p className="muted">{t('feedbackCount', { count: m.feedback })}</p>
        </div>
        {recent.length === 0 ? (
          <p className="muted">{t('noFeedback')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((f) => (
              <li key={f.id} className="space-y-1 py-3">
                <p className="text-sm font-semibold">
                  {tf(`kinds.${f.kind as 'problem' | 'idea' | 'other'}`)}
                  {f.page && <span className="muted font-normal"> · {f.page}</span>}
                </p>
                <p className="whitespace-pre-line">{f.message}</p>
                <p className="muted">
                  {t('feedbackFrom', {
                    name: f.name,
                    platform: f.platform,
                    date: format.dateTime(f.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
                  })}{' '}
                  ·{' '}
                  <a
                    href={`mailto:${f.email}`}
                    className="text-link underline underline-offset-2"
                    data-cs-mask
                  >
                    {f.email}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
