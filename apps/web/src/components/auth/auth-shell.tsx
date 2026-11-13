import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';

/** Moldura das telas de conta (entrar, criar conta, senha): logo, título e um cartão. */
export async function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const tc = await getTranslations('common');
  const tl = await getTranslations('legal');
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12 focus:outline-none sm:px-6"
    >
      <Link
        href="/"
        className="self-start rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>
      <div className="space-y-2">
        <h1 className="page-title">{title}</h1>
        {intro && <p className="muted">{intro}</p>}
      </div>
      <div className="flex overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <span className="w-2 shrink-0 bg-primary" aria-hidden="true" />
        <div className="flex-1 space-y-5 p-5 sm:p-6">{children}</div>
      </div>
      <p className="muted text-sm">
        <Link href="/privacidade" className="underline underline-offset-2">
          {tl('privacy')}
        </Link>
      </p>
    </main>
  );
}

/** Separador "ou" entre o Google e o e-mail. */
export async function OrDivider() {
  const t = await getTranslations('auth');
  return (
    <div className="flex items-center gap-3 text-sm" role="separator" aria-label={t('or')}>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      <span className="muted" aria-hidden="true">
        {t('or')}
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  );
}
