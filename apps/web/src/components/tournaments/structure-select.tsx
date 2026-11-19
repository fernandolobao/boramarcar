'use client';

import {
  structureOptions,
  type TournamentStructure,
  type TournamentTable,
} from '@boramarcar/core/tournaments';
import { useTranslations } from 'next-intl';
import { Select } from '../ds/select';

/** Estrutura do torneio (9.4): só aparece quando há escolha (mesas de par). */
export function StructureSelect({
  table,
  value,
  onChange,
}: {
  table: TournamentTable;
  value: TournamentStructure;
  onChange: (value: TournamentStructure) => void;
}) {
  const t = useTranslations('tournaments');
  const options = structureOptions(table);
  if (options.length < 2) return null;
  return (
    <Select
      label={t('structure.label')}
      value={options.includes(value) ? value : 'swiss'}
      onChange={onChange}
      description={t(`structure.hint.${options.includes(value) ? value : 'swiss'}`)}
      options={options.map((s) => ({ value: s, label: t(`structure.${s}`) }))}
    />
  );
}
