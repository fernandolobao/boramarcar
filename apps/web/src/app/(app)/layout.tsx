import Link from 'next/link';
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
    { href: '/painel', label: t('dashboard') },
    { href: '/disponibilidade', label: t('availability') },
    { href: '/eventos', label: t('events') },
    { href: '/ranking', label: t('ranking') },
    { href: '/decks', label: t('decks') },
    { href: '/grupo', label: t('group') },
    { href: '/perfil', label: t('profile') },
  ];

  return (
    <div className="min-h-dvh">
      <TimeZoneSync
        savedTimeZone={preferences.timeZoneIsDefault ? null : preferences.timeZone}
        cookieTimeZone={cookieStore.get(TIME_ZONE_COOKIE)?.value ?? null}
      />
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/painel" className="font-semibold">
            {tc('appName')}
            {active && <span className="muted ml-2 font-normal">· {active.name}</span>}
          </Link>
          <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
