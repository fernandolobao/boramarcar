import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { AuthShell, OrDivider } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/email-auth';
import { safeCallback } from '@/lib/safe-callback';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { searchParams: Promise<{ para?: string }> };

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ section: 'signIn', path: '/entrar' });

/** Entrar: Google ou e-mail e senha; `?para=` volta para a página de origem (ex.: convite). */
export default async function SignInPage({ searchParams }: Props) {
  const next = safeCallback((await searchParams).para);
  if (await getSessionUser(await headers()).catch(() => null)) redirect(next);
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('signInTitle')} intro={t('signInIntro')}>
      <SignInButton callbackURL={next} />
      <OrDivider />
      <SignInForm next={next} />
    </AuthShell>
  );
}
