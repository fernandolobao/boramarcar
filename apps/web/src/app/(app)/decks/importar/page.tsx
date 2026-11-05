import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DeckImportForm } from '@/components/deck-forms';
import { requireUser } from '@/server/current-user';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('decks'))('import') };
}

export default async function ImportDeckPage() {
  await requireUser();
  const t = await getTranslations('decks');
  return (
    <>
      <h1 className="page-title">{t('import')}</h1>
      <section className="card">
        <DeckImportForm />
      </section>
    </>
  );
}
