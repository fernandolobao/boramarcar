'use client';

import {
  MANA_CURVE_BUCKETS,
  type CardRole,
  type ManaCurveBucket,
  type ScoreComponent,
} from '@boramarcar/core';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Icon } from './icons';
import { CardNames } from './card-dialog';

/**
 * Curva de mana interativa (4.11): cada barra é um botão (`aria-pressed`) que mostra as cartas
 * daquele custo logo abaixo. O número fica sempre visível acima da barra.
 */
export function ManaCurve({
  curve,
  cardsByCurve,
}: {
  curve: Record<ManaCurveBucket, number>;
  cardsByCurve?: Record<ManaCurveBucket, string[]>;
}) {
  const t = useTranslations('analysis');
  const id = useId();
  const [selected, setSelected] = useState<ManaCurveBucket | null>(null);
  const max = Math.max(1, ...Object.values(curve));
  const interactive = Boolean(cardsByCurve);
  return (
    <figure>
      <figcaption className="section-title">{t('manaCurve')}</figcaption>
      {/*
        As barras precisam de um contêiner com altura definida: altura em % dentro de um
        item flex sem altura própria resolve para "auto" e a barra some (bug anterior).
      */}
      <ol className="flex items-end gap-2" aria-label={t('manaCurve')}>
        {MANA_CURVE_BUCKETS.map((bucket) => {
          const label = t('curveBucket', { bucket, count: curve[bucket] });
          const pressed = selected === bucket;
          const bar = (
            <>
              <span
                className="text-xs tabular-nums text-ink-600 dark:text-ink-400"
                aria-hidden="true"
              >
                {curve[bucket]}
              </span>
              <span className="flex h-32 w-full items-end" aria-hidden="true">
                <span
                  data-testid={`curve-bar-${bucket}`}
                  data-pressed={pressed || undefined}
                  className="deck-bar block w-full rounded-t-md"
                  style={{
                    height: `${(curve[bucket] / max) * 100}%`,
                    minHeight: curve[bucket] ? 4 : 0,
                  }}
                />
              </span>
              <span
                className={`text-xs ${pressed ? 'font-bold underline' : 'font-medium'}`}
                aria-hidden="true"
              >
                {bucket}
              </span>
            </>
          );
          return (
            <li key={bucket} className="flex flex-1 flex-col items-center" aria-label={label}>
              {interactive ? (
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 rounded-md px-0.5 pb-0.5 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-ink-800"
                  aria-pressed={pressed}
                  aria-controls={`${id}-cards`}
                  onClick={() => setSelected(pressed ? null : bucket)}
                >
                  {/* Nome pelo texto (não aria-label): os números visíveis são decorativos. */}
                  <span className="sr-only">{label}</span>
                  {bar}
                </button>
              ) : (
                <span className="flex w-full flex-col items-center gap-1">{bar}</span>
              )}
            </li>
          );
        })}
      </ol>
      {interactive && (
        <div id={`${id}-cards`} aria-live="polite" className="mt-3 min-h-10 text-sm">
          {selected === null ? (
            <p className="muted">{t('curveHint')}</p>
          ) : (
            <p>
              <span className="font-medium">
                {t('curveSelected', { bucket: selected, count: curve[selected] })}
              </span>{' '}
              <CardNames names={[...new Set(cardsByCurve![selected])]} />
            </p>
          )}
        </div>
      )}
    </figure>
  );
}

/**
 * Componentes da nota (4.11): barra com a pontuação e a meta, e um botão que explica o cálculo
 * e mostra as cartas que contam (funções).
 */
export function ScoreBreakdown({
  components,
  cardsByRole,
}: {
  components: readonly ScoreComponent[];
  cardsByRole: Record<CardRole, string[]>;
}) {
  const t = useTranslations('analysis');
  const format = useFormatter();
  const id = useId();
  const [open, setOpen] = useState<string | null>(null);
  const number = (n: number) => format.number(n, { maximumFractionDigits: 2 });

  const status = (c: ScoreComponent) => {
    if ('min' in c.target) {
      if (c.value < c.target.min) return 'below';
      if (c.value > c.target.max) return 'above';
      return 'ok';
    }
    if ('count' in c.target) return c.value >= c.target.count ? 'ok' : 'below';
    return c.value <= c.target.ideal ? 'ok' : 'above';
  };

  const explain = (c: ScoreComponent) => {
    const points = { points: number(c.score), maxPoints: c.max, value: number(c.value) };
    if ('min' in c.target) return t('explain.lands', { ...points, ...c.target });
    if ('count' in c.target) {
      return t('explain.role', {
        ...points,
        target: c.target.count,
        role: t(`roles.${c.key as CardRole}`),
      });
    }
    return t('explain.curve', {
      ...points,
      ideal: number(c.target.ideal),
      limit: number(c.target.max),
    });
  };

  const targetText = (c: ScoreComponent) =>
    'min' in c.target
      ? t('targetRange', c.target)
      : 'count' in c.target
        ? t('targetCount', { count: c.target.count })
        : t('targetCmc', { ideal: number(c.target.ideal) });

  return (
    <ul className="space-y-1">
      {components.map((c) => {
        const expanded = open === c.key;
        const state = status(c);
        const cards = c.key in cardsByRole ? [...new Set(cardsByRole[c.key as CardRole])] : [];
        return (
          <li key={c.key}>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-ink-800"
              aria-expanded={expanded}
              aria-controls={`${id}-${c.key}`}
              onClick={() => setOpen(expanded ? null : c.key)}
            >
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Icon
                    name="chevronDown"
                    className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                  />
                  {t(`components.${c.key}`)} <span className="muted">({number(c.value)})</span>
                </span>
                <span className="tabular-nums">
                  {number(c.score)}/{c.max}
                </span>
              </span>
              <span
                className="mt-1 block h-2 rounded-full bg-ink-200 dark:bg-ink-800"
                aria-hidden="true"
              >
                <span
                  className="deck-bar block h-2 rounded-full"
                  style={{ width: `${(c.score / c.max) * 100}%` }}
                />
              </span>
            </button>
            <div
              id={`${id}-${c.key}`}
              hidden={!expanded}
              className="mx-2 mt-1 mb-2 space-y-2 rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-800/60"
            >
              <p
                className={`flex items-center gap-1.5 font-medium ${
                  state === 'ok'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-amber-800 dark:text-amber-300'
                }`}
              >
                <Icon name={state === 'ok' ? 'ok' : 'warning'} />
                {t(`targetStatus.${state}`)} · {targetText(c)}
              </p>
              <p>{explain(c)}</p>
              {cards.length > 0 && (
                <p>
                  <span className="font-medium">{t('countedCards')}</span>{' '}
                  <CardNames names={cards} />
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
