import { getProductMetrics, listRecentFeedback } from '@boramarcar/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { requireAdmin } from '@/server/admin';
import { sectionMetadata } from '@/server/seo';

export const generateMetadata = sectionMetadata('admin', '/admin');

/** Métricas do beta (8.3) e feedback recente (8.4), só para ADMIN_EMAILS. */
export default async function AdminPage() {
  await requireAdmin();
  const db = getDb();
  const [m, recent] = await Promise.all([getProductMetrics(db), listRecentFeedback(db, 30)]);
  const t = await getTranslations('admin');
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
