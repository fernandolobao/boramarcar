import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@/components/auth-buttons';
import { AuthShell, OrDivider } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/email-auth';
import { safeCallback } from '@/lib/safe-callback';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { searchParams: Promise<{ para?: string }> };

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ section: 'signUp', path: '/cadastro', index: true });

/** Criar conta: com o Google ou com e-mail e senha (confirmando o e-mail). */
export default async function SignUpPage({ searchParams }: Props) {
  const next = safeCallback((await searchParams).para);
  if (await getSessionUser(await headers()).catch(() => null)) redirect(next);
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('signUpTitle')} intro={t('signUpIntro')}>
      <SignInButton callbackURL={next} label={t('signUpGoogle')} />
      <OrDivider />
      <SignUpForm next={next} />
    </AuthShell>
  );
}
