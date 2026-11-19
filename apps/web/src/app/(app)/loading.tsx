import { getTranslations } from 'next-intl/server';
import { PageSkeleton } from '@/components/page-skeleton';

/**
 * Troca de página na área logada: o esqueleto aparece na hora do clique (e o Next pode
 * pré-carregá-lo nos links), em vez de a tela antiga ficar parada até a nova chegar.
 */
export default async function Loading() {
  const t = await getTranslations('common');
  return <PageSkeleton label={t('loading')} />;
}
