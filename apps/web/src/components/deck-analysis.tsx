import type {
  BracketEstimate,
  ColorSymbol,
  DeckAnalysis,
  OpeningHandOdds,
  ColorSourceRow,
} from '@boramarcar/core';
import { bracketChecklist, deckFormatProfile } from '@boramarcar/core';
import { ScoreBreakdown } from './analysis-charts';

export { ManaCurve } from './analysis-charts';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from './icons';
import { ManaSymbol } from './mana';
import { CardName, CardNames } from './card-dialog';

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
        className="flex h-3 overflow-hidden rounded-full ring-1 ring-ink-900/15 dark:ring-white/15"
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
        <p className="flex items-center gap-1.5 text-sm text-success">
          <Icon name="ok" />
          {t('valid', { format: formatName })}
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {analysis.validation.map((issue, index) => {
            const { code, ...params } = issue;
            return (
              <li key={index}>
                {t.rich(`validation.${code}`, {
                  ...(params as Record<string, string | number>),
                  // Nomes de carta abrem a carta.
                  card: () => <CardName name={String((params as { name?: string }).name ?? '')} />,
                  cards: () => (
                    <CardNames
                      names={String((params as { names?: string }).names ?? '').split(' & ')}
                      separator=" & "
                    />
                  ),
                })}
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

const BRACKET_STEPS = [1, 2, 3, 4, 5] as const;
/** Brackets que o mínimo estimado cobre: 1–2 e 4–5 dependem da intenção. */
const BRACKET_RANGE: Record<2 | 3 | 4, readonly number[]> = { 2: [1, 2], 3: [3], 4: [4, 5] };
/** Cor de cada degrau (casas do contador e trilha): verde, dourado, vermelho. */
const SLOT_COLOR: Record<2 | 3 | 4, { on: string; off: string }> = {
  2: { on: 'bg-success border-success', off: 'border-success' },
  3: { on: 'bg-accent border-accent', off: 'border-accent' },
  4: { on: 'bg-danger border-danger', off: 'border-danger' },
};
const STATUS_ICON = { counted: 'ok', clear: 'unmarked', unchecked: 'rsvpMaybe' } as const;

/**
 * Bracket estimado (4.7) como lista de progresso: a trilha de 1 a 5 com o deck posicionado e um
 * card por critério oficial, marcado quando já conta para o cálculo, com o contador por degrau e
 * quanto falta para subir (ou quanto tirar para descer).
 */
export function BracketCard({
  bracket,
}: {
  bracket: BracketEstimate & { source: 'spellbook' | 'local' };
}) {
  const t = useTranslations('analysis');
  const list = bracketChecklist(bracket, bracket.source);
  const range = BRACKET_RANGE[list.minimum];
  const lastInRange = range[range.length - 1]!;
  return (
    <div className="space-y-4">
      <h2 className="section-title mb-0 flex items-center gap-2">
        <Icon name="bracket" />
        {t('bracketTitle')}
      </h2>
      <p className="text-2xl font-bold" data-testid="deck-bracket">
        {t(`bracketValue.${list.minimum}`)}
      </p>

      <ol aria-label={t('bracketTrail')} className="bracket-trail relative grid grid-cols-5 gap-1">
        {BRACKET_STEPS.map((step) => {
          const here = range.includes(step);
          const passed = step < range[0]!;
          return (
            <li
              key={step}
              aria-current={here ? 'step' : undefined}
              className="relative z-10 flex flex-col items-center gap-1 text-center"
            >
              <span
                aria-hidden="true"
                className={`flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  here
                    ? 'bracket-here border-primary bg-primary text-on-primary'
                    : passed
                      ? 'border-primary bg-surface text-fg'
                      : 'border-line-strong bg-surface text-fg-muted'
                }`}
              >
                {step}
              </span>
              <span className={`text-xs ${here ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
                <span className="sr-only">{t('bracketStep', { step })} · </span>
                <span className="hidden sm:inline">{t(`bracketLevels.${step}`)}</span>
                {here && <span className="sr-only"> · {t('bracketHere')}</span>}
              </span>
            </li>
          );
        })}
        <span
          aria-hidden="true"
          className="absolute top-[1.125rem] right-[10%] left-[10%] h-1 -translate-y-1/2 rounded-full bg-line"
        >
          <span
            className="bracket-trail-fill block h-full rounded-full bg-primary"
            style={{ width: `${((lastInRange - 1) / 4) * 100}%` }}
          />
        </span>
      </ol>
      {list.minimum !== 3 && <p className="muted">{t(`bracketRange.${list.minimum}`)}</p>}

      <div className="space-y-1">
        <p className="text-sm font-medium" id="bracket-progress-label">
          {t('bracketCounted', { counted: list.counted, total: list.items.length })}
        </p>
        <div
          role="meter"
          aria-labelledby="bracket-progress-label"
          aria-valuemin={0}
          aria-valuemax={list.items.length}
          aria-valuenow={list.counted}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <span
            className="bracket-trail-fill block h-full rounded-full bg-primary"
            style={{ width: `${(list.counted / list.items.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" aria-label={t('bracketChecklist')}>
        {list.items.map((item, index) => (
          <li
            key={item.code}
            data-testid={`bracket-item-${item.code}`}
            data-status={item.status}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`bracket-item flex flex-col gap-2 rounded-xl border p-3 ${
              item.status === 'counted'
                ? item.decisive
                  ? 'border-primary bg-surface'
                  : 'border-line-strong bg-surface'
                : 'border-line bg-surface-muted'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={item.status === 'counted' ? 'text-primary' : 'text-fg-muted'}>
                <Icon name={STATUS_ICON[item.status]} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{t(`bracketCriteria.${item.code}`)}</h3>
                <p className="muted text-xs">
                  {t(`bracketStatus.${item.status}`)}
                  {item.status === 'counted' && (
                    <> · {t('bracketImplies', { bracket: item.implies })}</>
                  )}
                </p>
              </div>
              {item.decisive && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-on-primary">
                  {t('bracketDecisive')}
                </span>
              )}
            </div>
            {item.status !== 'unchecked' && (
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden="true" className="flex flex-wrap gap-1">
                  {item.slots.slice(0, 10).map((slot, i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${index * 60 + i * 40}ms` }}
                      className={`bracket-pip size-3 rounded-full border-2 ${
                        i < item.count
                          ? SLOT_COLOR[slot].on
                          : `${SLOT_COLOR[slot].off} bg-transparent`
                      }`}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium">
                  {t(item.code.endsWith('combo') ? 'bracketCountCombos' : 'bracketCountCards', {
                    count: item.count,
                  })}
                </span>
              </div>
            )}
            {item.entries.length > 0 &&
              (item.code.endsWith('combo') ? (
                <ul className="space-y-1 text-sm">
                  {item.entries.map((combo, i) => (
                    <li key={i}>
                      <CardNames names={combo.cards} separator=" + " />
                      {combo.produces.length > 0 && (
                        <span className="muted text-xs"> ({combo.produces.join(', ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">
                  <CardNames names={item.entries.flatMap((e) => e.cards)} />
                </p>
              ))}
            <p className="muted text-xs">{t(`bracketLimits.${item.code}`)}</p>
            {item.next ? (
              <p className="text-xs font-medium">
                {item.next.kind === 'add'
                  ? t('bracketNextAdd', { amount: item.next.amount, bracket: item.next.bracket })
                  : t('bracketNextRemove', {
                      amount: item.next.amount,
                      bracket: item.next.bracket,
                    })}
              </p>
            ) : (
              item.status === 'unchecked' && (
                <p className="muted text-xs">{t('bracketUnchecked')}</p>
              )
            )}
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
              <tr className="border-b border-ink-200 dark:border-ink-800">
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
                <tr key={row.color} className="border-b border-ink-100 dark:border-ink-800/60">
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
            <tr className="border-b border-ink-200 dark:border-ink-800">
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
              <tr key={lands} className="border-b border-ink-100 dark:border-ink-800/60">
                <th scope="row" className="py-1.5 pe-3 font-normal tabular-nums">
                  {lands}
                </th>
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-12 shrink-0 tabular-nums">{percent(p)}</span>
                    <span
                      className="deck-bar h-2 rounded-full"
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
            <tr className="border-b border-ink-200 dark:border-ink-800">
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
              <tr key={d.turn} className="border-b border-ink-100 dark:border-ink-800/60">
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
