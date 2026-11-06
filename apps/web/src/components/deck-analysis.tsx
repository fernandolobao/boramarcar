import type { ColorSymbol, DeckAnalysis, ManaCurveBucket } from '@boramarcar/core';
import { MANA_CURVE_BUCKETS } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';
import { ManaSymbol } from './mana';

export function ManaCurve({ curve }: { curve: Record<ManaCurveBucket, number> }) {
  const t = useTranslations('analysis');
  const max = Math.max(1, ...Object.values(curve));
  return (
    <figure>
      <figcaption className="section-title">{t('manaCurve')}</figcaption>
      {/*
        As barras precisam de um contêiner com altura definida: altura em % dentro de um
        item flex sem altura própria resolve para "auto" e a barra some (bug anterior).
      */}
      <ol className="flex items-end gap-2" aria-label={t('manaCurve')}>
        {MANA_CURVE_BUCKETS.map((bucket) => (
          <li
            key={bucket}
            className="flex flex-1 flex-col items-center gap-1"
            aria-label={t('curveBucket', { bucket, count: curve[bucket] })}
          >
            <span
              className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400"
              aria-hidden="true"
            >
              {curve[bucket]}
            </span>
            <div className="flex h-32 w-full items-end" aria-hidden="true">
              <div
                data-testid={`curve-bar-${bucket}`}
                className="w-full rounded-t-md bg-brand-500"
                style={{
                  height: `${(curve[bucket] / max) * 100}%`,
                  minHeight: curve[bucket] ? 4 : 0,
                }}
              />
            </div>
            <span className="text-xs font-medium" aria-hidden="true">
              {bucket}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

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

export function DeckScore({ analysis }: { analysis: DeckAnalysis }) {
  const t = useTranslations('analysis');
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums" data-testid="deck-score">
          {analysis.score}
        </span>
        <span className="muted">/ 100 · {t('score')}</span>
      </div>
      <ul className="space-y-2">
        {analysis.scoreBreakdown.map((component) => (
          <li key={component.key}>
            <div className="flex justify-between text-sm">
              <span>
                {t(`components.${component.key}`)}{' '}
                <span className="muted">({component.value})</span>
              </span>
              <span className="tabular-nums">
                {component.score}/{component.max}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-brand-500"
                style={{ width: `${(component.score / component.max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="muted">{t('disclaimer')}</p>
    </div>
  );
}

export function DeckValidation({ analysis }: { analysis: DeckAnalysis }) {
  const t = useTranslations('analysis');
  return (
    <div>
      <h2 className="section-title">{t('validationTitle')}</h2>
      {analysis.validation.length === 0 ? (
        <p className="text-sm text-green-700 dark:text-green-400">{t('valid')}</p>
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
