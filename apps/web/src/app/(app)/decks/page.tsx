import { getDeckCovers, getDeckRatings, listDecks } from '@boramarcar/db';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { DeckGrid } from '@/components/deck-grid';
import { Icon } from '@/components/icons';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { EmptyState } from '@/components/empty-state';

export const generateMetadata = navMetadata('decks');

export default async function DecksPage() {
  const user = await requireUser();
  const db = getDb();
  const decks = await listDecks(db, user.id);
  const ids = decks.map((d) => d.id);
  const [covers, ratings] = await Promise.all([getDeckCovers(db, ids), getDeckRatings(db, ids)]);
  const t = await getTranslations('decks');

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
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <DeckGrid decks={decks} covers={covers} ratings={ratings} />
      )}
    </>
  );
}
