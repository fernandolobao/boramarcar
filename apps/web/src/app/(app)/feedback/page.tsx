import { getTranslations } from 'next-intl/server';
import { FeedbackForm } from '@/components/feedback-form';
import { requireUser } from '@/server/current-user';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('feedback');

type Props = { searchParams: Promise<{ de?: string }> };

/** Feedback do beta (8.4): o link do menu e do rodapé traz a página de origem em `?de=`. */
export default async function FeedbackPage({ searchParams }: Props) {
  await requireUser();
  const t = await getTranslations('feedback');
  const { de } = await searchParams;
  const page = de && de.startsWith('/') && !de.startsWith('//') ? de.split(/[?#]/)[0]! : null;
  return (
    <>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted max-w-2xl">{t('intro')}</p>
      </div>
      <section className="card max-w-2xl" aria-label={t('title')}>
        <FeedbackForm page={page} />
      </section>
    </>
  );
}
