import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/email-auth';
import { pageMetadata } from '@/server/seo';

export const generateMetadata = (): Promise<Metadata> =>
  pageMetadata({ section: 'forgotPassword', path: '/esqueci-senha' });

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('forgotTitle')} intro={t('forgotIntro')}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
