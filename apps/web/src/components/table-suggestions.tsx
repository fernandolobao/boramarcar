'use client';

import { suggestTables, type PairCount } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import { Icon } from './icons';

/**
 * Sugestão de mesas do encontro: divide quem confirmou juntando quem menos jogou junto (regra no
 * core). Só sugestão; "Sortear de novo" troca a semente. Some com menos de 6 confirmados.
 */
export function TableSuggestions({
  players,
  pairs,
  min,
  max,
}: {
  players: { userId: string; name: string }[];
  pairs: PairCount[];
  min: number;
  max: number;
}) {
  const t = useTranslations('events.tables');
  const id = useId();
  const [seed, setSeed] = useState(1);
  const result = useMemo(
    () =>
      suggestTables(
        players.map((p) => p.userId),
        pairs,
        { seed, min, max, preferred: Math.min(max, Math.max(min, 4)) },
      ),
    [players, pairs, seed, min, max],
  );
  if (!result) return null;
  const names = new Map(players.map((p) => [p.userId, p.name]));

  return (
    <section className="card space-y-4" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id={`${id}-title`} className="section-title mb-0">
            {t('title')}
          </h2>
          <p className="muted">{t('hint')}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setSeed((s) => s + 1)}>
          <Icon name="refresh" />
          {t('reroll')}
        </button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {result.tables.map((table, i) => (
          <li key={i} className="rounded-xl border border-line p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Icon name="table" />
              {t('table', { number: i + 1 })}
            </h3>
            <ul className="mb-2 flex flex-wrap gap-2">
              {[...table.playerIds]
                .sort((a, b) => (names.get(a) ?? '').localeCompare(names.get(b) ?? ''))
                .map((userId) => (
                  <li key={userId} className="rounded-full bg-surface-muted px-3 py-1 text-sm">
                    {names.get(userId)}
                  </li>
                ))}
            </ul>
            <p className="muted text-sm">{t('newPairs', { count: table.newPairs })}</p>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {seed > 1 ? t('rerolled') : ''}
      </p>
    </section>
  );
}
