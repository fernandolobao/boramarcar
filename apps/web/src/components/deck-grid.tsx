import { formatRules, isGameFormat } from '@boramarcar/core';
import type { DeckCover } from '@boramarcar/db';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ColorIdentity } from './deck-visual';
import { Icon } from './icons';

export interface DeckSummary {
  id: string;
  name: string;
  format: string;
  visibility: string;
  cardCount: number | null;
}

/** Nota e bracket mínimo de cada deck (getDeckRatings). */
export type DeckRatings = Map<string, { score: number | null; bracket: 2 | 3 | 4 | null }>;

const VISIBILITY_ICON = { private: 'private', group: 'group', public: 'public' } as const;

/** Visibilidade em texto + ícone (a cor não é a pista). */
export async function VisibilityBadge({ visibility }: { visibility: string }) {
  const t = await getTranslations('decks.visibility');
  const key = (['private', 'group', 'public'] as const).find((v) => v === visibility) ?? 'group';
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-300">
      <Icon name={VISIBILITY_ICON[key]} className="size-3.5 shrink-0" />
      {t(key)}
    </span>
  );
}

/** Grade responsiva de decks (lista de decks e perfil do jogador). */
export async function DeckGrid({
  decks,
  covers,
  ratings,
  showVisibility = true,
  headingLevel = 2,
}: {
  decks: DeckSummary[];
  covers: Map<string, DeckCover>;
  ratings?: DeckRatings;
  showVisibility?: boolean;
  headingLevel?: 2 | 3;
}) {
  const t = await getTranslations('decks');
  const tf = await getTranslations('formats');
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {decks.map((deck) => {
        const cover = covers.get(deck.id);
        const rating = ratings?.get(deck.id);
        const format = isGameFormat(deck.format) ? deck.format : 'other';
        const commanders = formatRules(format).usesCommander
          ? cover?.cards.map((c) => c.name).join(' & ')
          : null;
        return (
          <li
            key={deck.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-sm transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500 motion-reduce:transition-none dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="relative aspect-[16/10] bg-gradient-to-br from-ink-200 to-ink-300 dark:from-ink-800 dark:to-ink-700">
              {cover?.artUri && (
                <Image
                  src={cover.artUri}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              )}
              <span className="absolute top-2 left-2 rounded-full bg-ink-950/80 px-2.5 py-1 text-xs font-medium text-white">
                {tf(format)}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <Heading className="text-base font-semibold">
                  {/* O link cobre o cartão inteiro (::after), mantendo um único alvo de foco. */}
                  <Link
                    href={`/decks/${deck.id}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {deck.name}
                  </Link>
                </Heading>
                <ColorIdentity colors={cover?.colorIdentity ?? []} size="sm" />
              </div>
              {commanders !== null && (
                <p className="muted text-sm">{commanders || t('noCommander')}</p>
              )}
              {(rating?.score != null || rating?.bracket) && (
                <p className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                  {rating.score != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 font-medium">
                      {t('gridScore', { score: rating.score })}
                    </span>
                  )}
                  {rating.bracket && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 font-medium">
                      <Icon name="bracket" className="size-3.5 shrink-0" />
                      {t('gridBracket', { value: t(`bracketShort.${rating.bracket}`) })}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <p className="muted text-sm">{t('cards', { count: deck.cardCount ?? 0 })}</p>
                {showVisibility && <VisibilityBadge visibility={deck.visibility} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
