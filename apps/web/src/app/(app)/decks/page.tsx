import { formatRules, isGameFormat } from '@boramarcar/core';
import { getDeckCovers, listDecks } from '@boramarcar/db';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ColorIdentity } from '@/components/deck-visual';
import { Icon } from '@/components/icons';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('decks');

export default async function DecksPage() {
  const user = await requireUser();
  const db = getDb();
  const decks = await listDecks(db, user.id);
  const covers = await getDeckCovers(
    db,
    decks.map((d) => d.id),
  );
  const t = await getTranslations('decks');
  const tf = await getTranslations('formats');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="muted">{t('subtitle', { count: decks.length })}</p>
        </div>
        <Link href="/decks/importar" className="btn-primary">
          <Icon name="upload" />
          {t('import')}
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className="muted">{t('empty')}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {decks.map((deck) => {
            const cover = covers.get(deck.id);
            const format = isGameFormat(deck.format) ? deck.format : 'other';
            const commanders = formatRules(format).usesCommander
              ? cover?.cards.map((c) => c.name).join(' & ')
              : null;
            return (
              <li
                key={deck.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500 motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700">
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
                  <span className="absolute top-2 left-2 rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs font-medium text-white">
                    {tf(format)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold">
                      {/* O link cobre o cartão inteiro (::after), mantendo um único alvo de foco. */}
                      <Link
                        href={`/decks/${deck.id}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {deck.name}
                      </Link>
                    </h2>
                    <ColorIdentity colors={cover?.colorIdentity ?? []} size="sm" />
                  </div>
                  {commanders !== null && (
                    <p className="muted text-sm">{commanders || t('noCommander')}</p>
                  )}
                  <p className="muted mt-auto pt-2 text-sm">
                    {t('cards', { count: deck.cardCount ?? 0 })} ·{' '}
                    {t('proxies', { count: deck.proxyCount })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
