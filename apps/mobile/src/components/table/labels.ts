import type { GameFormat } from '@boramarcar/core/games';
import type { TableCounter } from '@boramarcar/core/table';
import { t, type MessageKey } from '@/lib/i18n';

const cap = (s: string) =>
  s
    .split('_')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');

/**
 * Nome de cada tipo de jogo. Mapa explícito (e não a chave montada a partir do código): um formato
 * novo no core sem texto aqui vira erro de compilação, em vez de quebrar a tela em tempo de execução.
 */
const FORMAT_LABEL: Record<GameFormat, MessageKey> = {
  commander: 'formatCommander',
  brawl: 'formatBrawl',
  oathbreaker: 'formatOathbreaker',
  two_headed_giant: 'formatTwoHeadedGiant',
  standard: 'formatStandard',
  pioneer: 'formatPioneer',
  modern: 'formatModern',
  legacy: 'formatLegacy',
  vintage: 'formatVintage',
  pauper: 'formatPauper',
  draft: 'formatDraft',
  sealed: 'formatSealed',
  other: 'formatOther',
};

/** Formato desconhecido (servidor mais novo que o app) cai em "Outro" em vez de quebrar. */
export const formatLabel = (format: GameFormat | string) =>
  t(FORMAT_LABEL[format as GameFormat] ?? 'formatOther');
export const counterLabel = (counter: TableCounter) =>
  t(`tableCounters${cap(counter)}` as MessageKey);
export const defeatLabel = (reason: 'life' | 'poison' | 'commander' | 'conceded') =>
  t(`tableDefeat${cap(reason)}` as MessageKey);
