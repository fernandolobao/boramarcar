import Link from 'next/link';
import { NavLinks } from '@/components/nav-links';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getUserPreferences } from '@boramarcar/db';
import { cookies } from 'next/headers';
import { SignOutButton } from '@/components/auth-buttons';
import { TimeZoneSync } from '@/components/time-zone-sync';
import { TIME_ZONE_COOKIE } from '@/i18n/config';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [{ active }, preferences, cookieStore] = await Promise.all([
    getActiveGroup(user.id),
    getUserPreferences(getDb(), user.id),
    cookies(),
  ]);
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');

  const links = [
    { href: '/painel', label: t('dashboard'), icon: 'dashboard' as const },
    { href: '/disponibilidade', label: t('availability'), icon: 'availability' as const },
    { href: '/eventos', label: t('events'), icon: 'events' as const },
    { href: '/ranking', label: t('ranking'), icon: 'ranking' as const },
    { href: '/decks', label: t('decks'), icon: 'decks' as const },
    { href: '/grupo', label: t('group'), icon: 'group' as const },
    { href: '/perfil', label: t('profile'), icon: 'profile' as const },
  ];

  return (
    <div className="min-h-dvh">
      <TimeZoneSync
        savedTimeZone={preferences.timeZoneIsDefault ? null : preferences.timeZone}
        cookieTimeZone={cookieStore.get(TIME_ZONE_COOKIE)?.value ?? null}
      />
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/painel" className="font-semibold">
            {tc('appName')}
            {active && <span className="muted ml-2 font-normal">· {active.name}</span>}
          </Link>
          <NavLinks label={t('label')} links={links} />
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </header>
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
