import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  const tn = await getTranslations('nav');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-bold">404</p>
      <p className="muted">{t('not_found')}</p>
      <Link href="/painel" className="btn-secondary">
        {tn('dashboard')}
      </Link>
    </main>
  );
}
