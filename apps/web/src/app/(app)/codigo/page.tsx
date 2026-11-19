import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EventCodeForm } from '@/components/stores/store-events';
import { requireUser } from '@/server/current-user';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('storeEvents');
  return pageMetadata({
    section: 'group',
    path: '/codigo',
    title: t('codeTitle'),
    description: t('codeMetaDescription'),
  });
}

/** Código de evento (10.2a): quem chega na loja digita o código do balcão para se inscrever. */
export default async function EventCodePage() {
  await requireUser();
  const t = await getTranslations('storeEvents');
  return (
    <>
      <div className="space-y-1">
        <h1 className="page-title">{t('codeTitle')}</h1>
        <p className="muted">{t('codeIntro')}</p>
      </div>
      <section className="card">
        <EventCodeForm />
      </section>
    </>
  );
}
