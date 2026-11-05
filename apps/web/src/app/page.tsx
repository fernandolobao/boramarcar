import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { getSessionUser } from '@/server/session';

export default async function LandingPage() {
  const user = await getSessionUser(await headers()).catch(() => null);
  if (user) redirect('/painel');
  const t = await getTranslations('landing');
  const tc = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          {tc('appName')}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{t('subtitle')}</p>
        <SignInButton />
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {(['schedule', 'ranking', 'decks'] as const).map((key) => (
          <li key={key} className="card text-sm">
            {t(`features.${key}`)}
          </li>
        ))}
      </ul>
    </main>
  );
}
