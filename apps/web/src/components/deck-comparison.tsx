import type { DeckComparison } from '@boramarcar/core';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from './icons';
import { CardName, CardNames } from './card-dialog';

/**
 * Comparação com outros decks do mesmo comandante no ArcanaKin e popularidade das cartas
 * (ranking do EDHREC publicado pelo Scryfall), com link para a página do comandante no EDHREC.
 */
export function DeckComparisonCard({
  commanders,
  comparison,
  edhrecUrl,
  leastPopular,
}: {
  commanders: string[];
  comparison: DeckComparison | null;
  edhrecUrl: string | null;
  leastPopular: { name: string; rank: number }[];
}) {
  const t = useTranslations('comparison');
  const tc = useTranslations('common');
  const format = useFormatter();
  const num = (n: number | null) =>
    n === null ? '—' : format.number(n, { maximumFractionDigits: 1 });
  const percent = (n: number) => format.number(n, { style: 'percent' });
  const commander = format.list(commanders, { type: 'conjunction' });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title mb-1">{t('title')}</h2>
          <p className="muted text-sm">{t('hint', { commander })}</p>
        </div>
        {edhrecUrl && (
          <a href={edhrecUrl} target="_blank" rel="noreferrer" className="btn-secondary">
            <Icon name="externalLink" />
            {t('edhrec')}
            <span className="sr-only"> {tc('newTab')}</span>
          </a>
        )}
      </div>

      {!comparison || comparison.decks === 0 ? (
        <p className="text-sm">{t('none', { commander })}</p>
      ) : (
        <>
          <div>
            <table className="w-full max-w-xl text-left text-sm">
              <caption className="mb-2 text-left font-semibold">
                {t('tableCaption', { count: comparison.decks })}
              </caption>
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800">
                  <th scope="col" className="py-1.5 pe-3 font-medium">
                    {t('metric')}
                  </th>
                  <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                    {t('thisDeck')}
                  </th>
                  <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                    {t('average')}
                  </th>
                  <th scope="col" className="py-1.5 text-end font-medium">
                    {t('difference')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.metrics.map((m) => {
                  const diff =
                    m.value !== null && m.average !== null
                      ? Math.round((m.value - m.average) * 10) / 10
                      : null;
                  return (
                    <tr key={m.key} className="border-b border-ink-100 dark:border-ink-800/60">
                      <th scope="row" className="py-1.5 pe-3 font-normal">
                        {t(`metrics.${m.key}`)}
                      </th>
                      <td className="py-1.5 pe-3 text-end tabular-nums">{num(m.value)}</td>
                      <td className="py-1.5 pe-3 text-end tabular-nums">{num(m.average)}</td>
                      <td className="py-1.5 text-end tabular-nums">
                        {diff === null
                          ? '—'
                          : diff === 0
                            ? t('same')
                            : `${diff > 0 ? '+' : '−'}${num(Math.abs(diff))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-1 font-semibold">{t('commonMissing')}</h3>
              <p className="muted mb-2 text-sm">{t('commonMissingHint')}</p>
              {comparison.commonMissing.length ? (
                <ul className="space-y-1 text-sm">
                  {comparison.commonMissing.map((c) => (
                    <li key={c.name}>
                      <CardName name={c.name} />{' '}
                      <span className="muted">({t('inShare', { share: percent(c.share) })})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">{t('noCommonMissing')}</p>
              )}
            </div>
            <div>
              <h3 className="mb-1 font-semibold">{t('unique')}</h3>
              <p className="muted mb-2 text-sm">{t('uniqueHint')}</p>
              {comparison.unique.length ? (
                <p className="text-sm">
                  <CardNames names={comparison.unique} />
                </p>
              ) : (
                <p className="text-sm">{t('noUnique')}</p>
              )}
            </div>
          </div>
        </>
      )}

      {leastPopular.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">{t('leastPopular')}</h3>
          <p className="muted mb-2 text-sm">{t('leastPopularHint')}</p>
          <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {leastPopular.map((c) => (
              <li key={c.name}>
                {c.name}{' '}
                <span className="muted">({t('rank', { rank: format.number(c.rank) })})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
