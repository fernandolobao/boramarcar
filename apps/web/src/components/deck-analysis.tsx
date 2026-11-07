import type {
  BracketEstimate,
  ColorSymbol,
  DeckAnalysis,
  OpeningHandOdds,
  ColorSourceRow,
} from '@boramarcar/core';
import { deckFormatProfile } from '@boramarcar/core';
import { ScoreBreakdown } from './analysis-charts';

export { ManaCurve } from './analysis-charts';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from './icons';
import { ManaSymbol } from './mana';

/** Cores das barras: as mesmas dos símbolos de mana. */
const PIP_COLOR: Record<ColorSymbol, string> = {
  W: '#f0f2c0',
  U: '#b5cde3',
  B: '#aca29a',
  R: '#db8664',
  G: '#93b483',
  C: '#ccc2c0',
};

export function ColorPips({ pips }: { pips: Record<ColorSymbol, number> }) {
  const t = useTranslations('analysis');
  const tm = useTranslations('mana');
  const colors = (Object.keys(pips) as ColorSymbol[]).filter((c) => pips[c] > 0);
  const total = colors.reduce((sum, c) => sum + pips[c], 0);
  if (!total) return null;
  return (
    <div>
      <h3 className="section-title">{t('colorPips')}</h3>
      {/* Barra decorativa: a mesma informação está na lista abaixo. */}
      <div
        className="flex h-3 overflow-hidden rounded-full ring-1 ring-zinc-900/15 dark:ring-white/15"
        aria-hidden="true"
      >
        {colors.map((color) => (
          <div
            key={color}
            className="h-full"
            style={{ flexGrow: pips[color], flexBasis: 0, backgroundColor: PIP_COLOR[color] }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {colors.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <ManaSymbol symbol={c} className="text-base" />
            <span className="font-medium tabular-nums">{pips[c]}</span>
            <span className="sr-only">{tm(`colors.${c.toLowerCase() as 'w'}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeckScore({
  analysis,
  formatName,
}: {
  analysis: DeckAnalysis;
  formatName: string;
}) {
  const t = useTranslations('analysis');
  if (analysis.score === null) return <p>{t('noScore', { format: formatName })}</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums" data-testid="deck-score">
          {analysis.score}
        </span>
        <span className="muted">/ 100 · {t('score')}</span>
      </div>
      <ScoreBreakdown components={analysis.scoreBreakdown} cardsByRole={analysis.cardsByRole} />
      <p className="muted text-sm">{t('scoreHint')}</p>
      <p className="muted">{t('disclaimer', { format: formatName })}</p>
    </div>
  );
}

export function DeckValidation({
  analysis,
  formatName,
}: {
  analysis: DeckAnalysis;
  formatName: string;
}) {
  const t = useTranslations('analysis');
  return (
    <div>
      <h2 className="section-title">{t('validationTitle', { format: formatName })}</h2>
      {analysis.validation.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <Icon name="ok" />
          {t('valid', { format: formatName })}
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {analysis.validation.map((issue, index) => {
            const { code, ...params } = issue;
            return (
              <li key={index}>
                {t(`validation.${code}`, params as Record<string, string | number>)}
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted mt-3 text-xs">
        {deckFormatProfile(analysis.format).scryfallFormat
          ? t('legalityNote')
          : t('validationNote')}
        {analysis.legalityMissing > 0 && (
          <> {t('legalityMissing', { count: analysis.legalityMissing })}</>
        )}
      </p>
    </div>
  );
}

export function DeckSuggestions({ analysis }: { analysis: DeckAnalysis }) {
  const t = useTranslations('analysis');
  const tc = useTranslations('common');
  if (!analysis.suggestions.length) return null;
  return (
    <div>
      <h2 className="section-title">{t('suggestionsTitle')}</h2>
      <ul className="space-y-2 text-sm">
        {analysis.suggestions.map((s, index) => (
          <li key={index}>
            {s.code === 'more_role' ? (
              <>
                {t('suggestions.more_role', { missing: s.missing, role: t(`roles.${s.role}`) })}{' '}
                <a
                  className="text-brand-600 underline dark:text-brand-400"
                  href={`https://scryfall.com/search?q=${encodeURIComponent(s.scryfallQuery)}&order=edhrec`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('searchScryfall')}
                  <Icon name="externalLink" className="ml-1 inline size-3.5 align-[-2px]" />
                  {/* Contexto extra para leitores de tela, mantendo o texto visível no nome (WCAG 2.5.3). */}
                  <span className="sr-only">
                    {' '}
                    ({t(`roles.${s.role}`)}) {tc('newTab')}
                  </span>
                </a>
              </>
            ) : s.code === 'more_lands' ? (
              t('suggestions.more_lands', { missing: s.missing })
            ) : s.code === 'fewer_lands' ? (
              t('suggestions.fewer_lands', { extra: s.extra })
            ) : (
              t('suggestions.lower_curve', { averageCmc: s.averageCmc })
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Probabilidade em %; abaixo de 1% vira "<1%" (0 exato continua 0%). */
function usePercent() {
  const format = useFormatter();
  return (value: number) =>
    value > 0 && value < 0.005
      ? `<${format.number(0.01, { style: 'percent' })}`
      : format.number(value, { style: 'percent', maximumFractionDigits: 0 });
}

const join = (items: readonly string[]) => items.join(', ');

/** Bracket mínimo (4.7) com os motivos. */
export function BracketCard({
  bracket,
}: {
  bracket: BracketEstimate & { source: 'spellbook' | 'local' };
}) {
  const t = useTranslations('analysis');
  return (
    <div className="space-y-3">
      <h2 className="section-title mb-0 flex items-center gap-2">
        <Icon name="bracket" />
        {t('bracketTitle')}
      </h2>
      <p className="text-2xl font-bold" data-testid="deck-bracket">
        {t(`bracketValue.${bracket.minimum}`)}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {bracket.reasons.map((reason, index) => (
          <li key={index}>
            {reason.code === 'game_changers'
              ? t('bracketReasons.game_changers', {
                  count: reason.count,
                  cards: join(reason.cards),
                })
              : reason.code === 'mass_land_denial'
                ? t('bracketReasons.mass_land_denial', { cards: join(reason.cards) })
                : reason.code === 'extra_turns'
                  ? t(
                      reason.chained
                        ? 'bracketReasons.extra_turns_chained'
                        : 'bracketReasons.extra_turns',
                      { cards: join(reason.cards) },
                    )
                  : reason.code === 'clean'
                    ? t('bracketReasons.clean')
                    : t(`bracketReasons.${reason.code}`, {
                        cards: reason.cards.join(' + '),
                        produces: join(reason.produces),
                      })}
          </li>
        ))}
      </ul>
      <p className="muted text-sm">
        {bracket.source === 'spellbook' ? t('bracketSourceSpellbook') : t('bracketSourceLocal')}
      </p>
      <p className="muted text-sm">{t('bracketHint')}</p>
    </div>
  );
}

/** Fontes de mana por cor × símbolos (4.8). */
export function ManaBaseTable({
  rows,
  missing,
}: {
  rows: readonly ColorSourceRow[];
  missing: number;
}) {
  const t = useTranslations('analysis');
  const tm = useTranslations('mana');
  const percent = usePercent();
  return (
    <div className="space-y-3">
      <h2 className="section-title mb-0">{t('manaBaseTitle')}</h2>
      <p className="muted text-sm">{t('manaBaseHint')}</p>
      {rows.length === 0 ? (
        <p className="text-sm">{t('manaEmpty')}</p>
      ) : (
        // Rolagem horizontal em telas estreitas: a região recebe foco para rolar pelo teclado.
        <div
          className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-brand-500"
          role="region"
          aria-label={t('manaBaseTitle')}
          // Região rolável precisa de foco pelo teclado (axe: scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="py-2 pe-3 font-medium">
                  {t('manaCols.color')}
                </th>
                <th scope="col" className="py-2 pe-3 text-end font-medium">
                  {t('manaCols.pips')}
                </th>
                <th scope="col" className="py-2 pe-3 text-end font-medium">
                  {t('manaCols.lands')}
                </th>
                <th scope="col" className="py-2 pe-3 text-end font-medium">
                  {t('manaCols.other')}
                </th>
                <th scope="col" className="py-2 pe-3 text-end font-medium">
                  {t('manaCols.recommended')}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t('manaCols.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.color} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <th scope="row" className="py-2 pe-3 font-normal">
                    <span className="flex items-center gap-1.5 capitalize">
                      <ManaSymbol symbol={row.color} className="text-base" />
                      {tm(`colors.${row.color.toLowerCase() as 'w'}`)}
                    </span>
                  </th>
                  <td className="py-2 pe-3 text-end tabular-nums">
                    {row.pips} <span className="muted">({percent(row.share)})</span>
                  </td>
                  <td className="py-2 pe-3 text-end tabular-nums">{row.landSources}</td>
                  <td className="py-2 pe-3 text-end tabular-nums">{row.otherSources}</td>
                  <td className="py-2 pe-3 text-end tabular-nums">{row.recommended}</td>
                  <td className="py-2">
                    {row.status === 'unknown' ? (
                      <span className="muted">{t('manaUnknown')}</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          row.status === 'ok'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <Icon name={row.status === 'ok' ? 'ok' : 'warning'} />
                        {row.status === 'ok' ? t('manaOk') : t('manaLow')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {missing > 0 && <p className="muted text-sm">{t('manaMissing', { count: missing })}</p>}
    </div>
  );
}

/** Chances da mão inicial e das jogadas de terreno (4.9). */
export function HandOdds({ odds }: { odds: OpeningHandOdds }) {
  const t = useTranslations('analysis');
  const percent = usePercent();
  const format = useFormatter();
  const max = Math.max(...odds.distribution);
  return (
    <div className="space-y-4">
      <h2 className="section-title mb-0 flex items-center gap-2">
        <Icon name="openingHand" />
        {t('handTitle')}
      </h2>
      <p className="muted text-sm">{t('handHint', { library: odds.library, lands: odds.lands })}</p>
      <ul className="space-y-1 text-sm">
        <li>
          {t('handExpected', {
            value: format.number(odds.expectedLands, { maximumFractionDigits: 1 }),
          })}
        </li>
        <li>{t('handKeepable', { value: percent(odds.keepable) })}</li>
        {odds.rampByTurn.map((r) => (
          <li key={r.turn}>{t('handRamp', { turn: r.turn, value: percent(r.onDraw) })}</li>
        ))}
      </ul>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">{t('handDistribution')}</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="py-1.5 pe-3 font-medium">
                {t('handColLands')}
              </th>
              <th scope="col" className="py-1.5 font-medium">
                {t('handColChance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {odds.distribution.map((p, lands) => (
              <tr key={lands} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <th scope="row" className="py-1.5 pe-3 font-normal tabular-nums">
                  {lands}
                </th>
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-12 shrink-0 tabular-nums">{percent(p)}</span>
                    <span
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${max ? (p / max) * 100 : 0}%`, maxWidth: '10rem' }}
                      aria-hidden="true"
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">{t('handDrops')}</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="py-1.5 pe-3 font-medium">
                {t('handColTurn')}
              </th>
              <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                {t('handOnPlay')}
              </th>
              <th scope="col" className="py-1.5 text-end font-medium">
                {t('handOnDraw')}
              </th>
            </tr>
          </thead>
          <tbody>
            {odds.landDrops.map((d) => (
              <tr key={d.turn} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <th scope="row" className="py-1.5 pe-3 font-normal tabular-nums">
                  {d.turn}
                </th>
                <td className="py-1.5 pe-3 text-end tabular-nums">{percent(d.onPlay)}</td>
                <td className="py-1.5 text-end tabular-nums">{percent(d.onDraw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
