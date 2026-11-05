import { listDecks } from '@boramarcar/db';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('decks');

export default async function DecksPage() {
  const user = await requireUser();
  const decks = await listDecks(getDb(), user.id);
  const t = await getTranslations('decks');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">{t('title')}</h1>
        <Link href="/decks/importar" className="btn-primary">
          {t('import')}
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className="muted">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link href={`/decks/${deck.id}`} className="card block hover:border-brand-400">
                <p className="font-medium">{deck.name}</p>
                <p className="muted">
                  {t('cards', { count: deck.cardCount ?? 0 })} ·{' '}
                  {t('proxies', { count: deck.proxyCount })} · {deck.source}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
