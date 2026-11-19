'use client';

import { topCutOptions, type TournamentTable } from '@boramarcar/core/tournaments';
import { useTranslations } from 'next-intl';
import { Select } from '../ds/select';

/**
 * Top cut depois do suíço (9.2). `entrants` limita aos tops que deixam alguém de fora (quando já se
 * sabe quantos vão jogar, como no torneio de loja); sem ele, todos os tamanhos do tipo de mesa.
 */
export function TopCutSelect({
  table,
  entrants = Number.POSITIVE_INFINITY,
  value,
  onChange,
}: {
  table: TournamentTable;
  entrants?: number;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations('tournaments');
  const sizes = topCutOptions(table, entrants);
  if (!sizes.length) return null;
  return (
    <Select
      label={t('topCut.label')}
      value={value && sizes.includes(value) ? String(value) : ''}
      onChange={(v) => onChange(v ? Number(v) : null)}
      description={t(`topCut.hint.${table}`)}
      options={[
        { value: '', label: t('topCut.none') },
        ...sizes.map((size) => ({
          value: String(size),
          label: t('topCut.option', { count: size }),
        })),
      ]}
    />
  );
}
