import Link from 'next/link';
import { ViewTransition } from 'react';
import { HoloEffects } from '@/components/holo-effects';
import { ManaFlow } from '@/components/mana-flow';
import { BackLink } from '@/components/back-link';
import { NavLinks } from '@/components/nav-links';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getUserPreferences } from '@boramarcar/db';
import { cookies } from 'next/headers';
import { LocaleSync } from '@/components/locale-sync';
import { TimeZoneSync } from '@/components/time-zone-sync';
import { isLocale, LOCALE_COOKIE } from '@/i18n/config';
import { Logo } from '@/components/logo';
import { UserMenu } from '@/components/user-menu';
import { TIME_ZONE_COOKIE } from '@/i18n/config';
import { getActiveGroup } from '@/server/active-group';
import { requireUser } from '@/server/current-user';
import { isAdmin } from '@/server/admin';
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
  const tl = await getTranslations('legal');

  const links = [
    { href: '/painel', label: t('dashboard'), icon: 'dashboard' as const },
    { href: '/disponibilidade', label: t('availability'), icon: 'availability' as const },
    { href: '/eventos', label: t('events'), icon: 'events' as const },
    { href: '/ranking', label: t('ranking'), icon: 'ranking' as const },
    { href: '/decks', label: t('decks'), icon: 'decks' as const },
    { href: '/colecao', label: t('collection'), icon: 'collection' as const },
    { href: '/grupo', label: t('group'), icon: 'group' as const },
  ];

  return (
    // isolate: o fluxo de mana fica atrás de tudo sem sair desta área; overflow-x-clip (e não
    // hidden) corta a lateral sem quebrar o `position: sticky` das seções empilhadas.
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <ManaFlow />
      <HoloEffects />
      <LocaleSync
        savedLocale={isLocale(preferences.locale) ? preferences.locale : null}
        hasCookie={isLocale(cookieStore.get(LOCALE_COOKIE)?.value)}
      />
      <TimeZoneSync
        savedTimeZone={preferences.timeZoneIsDefault ? null : preferences.timeZone}
        cookieTimeZone={cookieStore.get(TIME_ZONE_COOKIE)?.value ?? null}
      />
      {/* relative + z-30: o cabeçalho (com backdrop-blur, que cria um contexto de empilhamento)
          fica acima do conteúdo, para o menu da conta não passar por trás de imagens. */}
      <header className="relative z-30 border-b print:hidden border-line bg-surface/85 backdrop-blur">
        {/* Linha 1: marca + grupo ativo e menu da conta. Linha 2: navegação (rola no celular).
            Assim nada quebra com nomes de grupo longos nem com idiomas de rótulos maiores. */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3">
          <Link href="/painel" className="min-w-0 rounded-lg leading-tight">
            <Logo title={tc('appName')} className="h-5 w-auto text-arcano dark:text-ink-100" />
            {active && (
              <span className="muted block max-w-[60vw] truncate text-sm sm:max-w-md">
                {active.name}
              </span>
            )}
          </Link>
          <UserMenu
            name={user.name}
            email={user.email}
            image={user.image ?? null}
            admin={isAdmin(user.email)}
          />
        </div>
        <div className="mx-auto max-w-5xl px-4 pt-2 pb-1">
          <NavLinks label={t('label')} links={links} />
        </div>
      </header>
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 focus:outline-none print:max-w-none print:p-0"
      >
        {/* Páginas fora da navegação principal ganham "Voltar" (mesmo lugar em todas). */}
        <BackLink main={links.map((l) => l.href)} />
        {/* Transição entre telas (View Transitions): o conteúdo troca com um esmaecer curto ao
            mudar de seção e desliza um pouco ao entrar num deck ou voltar. O cabeçalho fica
            parado. Sem suporte no navegador ou com "reduzir movimento", a troca é instantânea. */}
        <ViewTransition
          update={{
            'nav-section': 'nav-fade',
            'nav-forward': 'nav-forward',
            'nav-back': 'nav-back',
            default: 'none',
          }}
          default="none"
        >
          <div className="space-y-6">{children}</div>
        </ViewTransition>
      </main>
      <footer className="mx-auto flex max-w-5xl flex-wrap gap-x-4 gap-y-2 px-4 pb-8 text-sm print:hidden">
        <Link href="/ajuda" className="muted underline underline-offset-2 hover:text-fg">
          {tl('help')}
        </Link>
        <Link href="/privacidade" className="muted underline underline-offset-2 hover:text-fg">
          {tl('privacy')}
        </Link>
        <Link href="/feedback" className="muted underline underline-offset-2 hover:text-fg">
          {t('feedback')}
        </Link>
      </footer>
    </div>
  );
}
