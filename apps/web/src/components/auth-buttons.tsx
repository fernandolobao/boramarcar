'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function SignInButton({ callbackURL = '/painel' }: { callbackURL?: string }) {
  const t = useTranslations('common');
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary px-6 text-base"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signIn.social({ provider: 'google', callbackURL });
      }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5">
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51Z"
        />
      </svg>
      {pending ? t('loading') : t('signIn')}
    </button>
  );
}

export function SignOutButton() {
  const t = useTranslations('common');
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await authClient.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      {t('signOut')}
    </button>
  );
}
