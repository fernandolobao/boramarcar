import { isLand } from './roles';
import type { AnalyzableCard, DeckAnalysis } from './index';

/** Página do comandante no EDHREC (só link; o EDHREC não permite consultas automáticas). */
export function edhrecCommanderUrl(commanders: readonly string[]): string | null {
  if (!commanders.length) return null;
  const slug = (name: string) =>
    (name.split(' // ')[0] ?? name)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’,.!]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  // Parceiros: os dois nomes em ordem alfabética, como o EDHREC monta a URL.
  return `https://edhrec.com/commanders/${commanders.map(slug).sort().join('-')}`;
}

export interface ComparableDeck {
  analysis: Pick<DeckAnalysis, 'score' | 'lands' | 'averageCmc' | 'roles'>;
  /** Cartas (não terrenos básicos) do principal, por nome. */
  cards: readonly string[];
}

export const COMPARISON_METRICS = [
  'score',
  'lands',
  'averageCmc',
  'ramp',
  'draw',
  'removal',
  'wipe',
] as const;
export type ComparisonMetric = (typeof COMPARISON_METRICS)[number];

export interface DeckComparison {
  /** Quantos outros decks do mesmo comandante entraram na média. */
  decks: number;
  metrics: { key: ComparisonMetric; value: number | null; average: number | null }[];
  /** Cartas presentes em pelo menos metade dos outros decks e ausentes neste. */
  commonMissing: { name: string; share: number }[];
  /** Cartas deste deck que nenhum outro deck do comandante usa. */
  unique: string[];
}

const metricOf = (a: ComparableDeck['analysis'], key: ComparisonMetric) =>
  key === 'score'
    ? a.score
    : key === 'lands'
      ? a.lands
      : key === 'averageCmc'
        ? a.averageCmc
        : a.roles[key];

const round = (n: number) => Math.round(n * 10) / 10;

/** Cartas que contam na comparação: principal, sem terrenos básicos. */
export function comparableCards(entries: readonly AnalyzableCard[]): string[] {
  return [
    ...new Set(
      entries
        .filter((e) => e.board === 'mainboard')
        .filter((e) => !e.card || !(isLand(e.card) && /\bBasic\b/.test(e.card.typeLine)))
        .map((e) => e.name),
    ),
  ];
}

/**
 * Compara o deck com outros do mesmo comandante cadastrados no app (4.10): médias das métricas
 * da análise e cartas em comum. `minShare` = fatia mínima dos outros decks para "comum".
 */
export function compareWithDecks(
  target: ComparableDeck,
  others: readonly ComparableDeck[],
  minShare = 0.5,
): DeckComparison {
  const metrics = COMPARISON_METRICS.map((key) => {
    const values = others
      .map((o) => metricOf(o.analysis, key))
      .filter((v): v is number => v !== null);
    return {
      key,
      value: metricOf(target.analysis, key),
      average: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    };
  });
  const counts = new Map<string, { name: string; count: number }>();
  for (const deck of others) {
    for (const name of new Set(deck.cards.map((c) => c.toLowerCase()))) {
      const display = deck.cards.find((c) => c.toLowerCase() === name)!;
      const current = counts.get(name);
      counts.set(name, { name: current?.name ?? display, count: (current?.count ?? 0) + 1 });
    }
  }
  const mine = new Set(target.cards.map((c) => c.toLowerCase()));
  const commonMissing = others.length
    ? [...counts.entries()]
        .filter(([key, c]) => !mine.has(key) && c.count / others.length >= minShare)
        .map(([, c]) => ({ name: c.name, share: c.count / others.length }))
        .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))
        .slice(0, 15)
    : [];
  const unique = others.length
    ? target.cards.filter((c) => !counts.has(c.toLowerCase())).sort((a, b) => a.localeCompare(b))
    : [];
  return { decks: others.length, metrics, commonMissing, unique };
}

/** Cartas menos jogadas do deck pelo ranking do EDHREC publicado pelo Scryfall (`edhrec_rank`). */
export function leastPopularCards(entries: readonly AnalyzableCard[], limit = 8) {
  const seen = new Set<string>();
  return entries
    .filter((e) => e.board === 'mainboard' && e.card && !isLand(e.card) && e.card.edhrecRank)
    .filter((e) => (seen.has(e.name) ? false : (seen.add(e.name), true)))
    .map((e) => ({ name: e.name, rank: e.card!.edhrecRank! }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}
