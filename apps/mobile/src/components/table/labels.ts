import type { GameFormat } from '@boramarcar/core/games';
import type { TableCounter } from '@boramarcar/core/table';
import { t, type MessageKey } from '@/lib/i18n';

const cap = (s: string) =>
  s
    .split('_')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');

export const formatLabel = (format: GameFormat) => t(`format${cap(format)}` as MessageKey);
export const counterLabel = (counter: TableCounter) =>
  t(`tableCounters${cap(counter)}` as MessageKey);
export const defeatLabel = (reason: 'life' | 'poison' | 'commander' | 'conceded') =>
  t(`tableDefeat${cap(reason)}` as MessageKey);
