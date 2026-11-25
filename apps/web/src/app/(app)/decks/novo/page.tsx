import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { DeckCreateForm } from '@/components/deck-forms';
import { requireUser } from '@/server/current-user';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    section: 'deckImport',
    path: '/decks/novo',
    title: (await getTranslations('decks'))('create.title'),
  });
}

/** Deck do zero (11.1): nome, tipo de jogo e comandante; começa como rascunho (11.2). */
export default async function NewDeckPage() {
  await requireUser();
  const t = await getTranslations('decks');
  return (
    <>
      <div className="space-y-1">
        <h1 className="page-title">{t('create.title')}</h1>
        <p className="muted">{t('create.intro')}</p>
      </div>
      <section className="card">
        <DeckCreateForm />
      </section>
      <p className="muted">
        <Link href="/decks/importar" className="underline underline-offset-2">
          {t('create.orImport')}
        </Link>
      </p>
    </>
  );
}
