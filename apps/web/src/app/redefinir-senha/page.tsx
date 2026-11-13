import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/email-auth';
import { pageMetadata } from '@/server/seo';

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ section: 'resetPassword', path: '/redefinir-senha' });

/** Nova senha pelo link do e-mail (`?token=`; link vencido chega com `?error=INVALID_TOKEN`). */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('resetTitle')}>
      <ResetPasswordForm token={!error && token ? token : null} />
    </AuthShell>
  );
}
