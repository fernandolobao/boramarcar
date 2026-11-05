import { getTranslations } from 'next-intl/server';
import { DeckImportForm } from '@/components/deck-forms';
import { requireUser } from '@/server/current-user';

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
