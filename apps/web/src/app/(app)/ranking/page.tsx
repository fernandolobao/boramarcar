import { getGroupRanking } from '@boramarcar/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('ranking');

export default async function RankingPage() {
  const { user, group } = await requireUserAndGroup();
  const ranking = await getGroupRanking(getDb(), { groupId: group.id, userId: user.id });
  const t = await getTranslations('ranking');
  const format = await getFormatter();

  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">
          {t('totalGames', { count: ranking.totalGames })} · {t('pointsRule')}
        </p>
      </div>
      <section className="card overflow-x-auto">
        {ranking.standings.length === 0 ? (
          <p className="muted">{t('empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2 pr-2">{t('position')}</th>
                <th className="py-2 pr-2">{t('player')}</th>
                <th className="py-2 pr-2 text-right">{t('games')}</th>
                <th className="py-2 pr-2 text-right">{t('wins')}</th>
                <th className="py-2 pr-2 text-right">{t('losses')}</th>
                <th className="py-2 pr-2 text-right">{t('draws')}</th>
                <th className="py-2 pr-2 text-right">{t('winRate')}</th>
                <th className="py-2 text-right">{t('points')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {ranking.standings.map((s) => (
                <tr
                  key={s.userId}
                  className={`border-t border-zinc-200 dark:border-zinc-800 ${s.userId === user.id ? 'font-semibold' : ''}`}
                >
                  <td className="py-2 pr-2">{s.position}</td>
                  <td className="py-2 pr-2">{s.name}</td>
                  <td className="py-2 pr-2 text-right">{s.games}</td>
                  <td className="py-2 pr-2 text-right">{s.wins}</td>
                  <td className="py-2 pr-2 text-right">{s.losses}</td>
                  <td className="py-2 pr-2 text-right">{s.draws}</td>
                  <td className="py-2 pr-2 text-right">
                    {format.number(s.winRate, { style: 'percent' })}
                  </td>
                  <td className="py-2 text-right font-semibold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
