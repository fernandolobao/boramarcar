import type { Metadata, Viewport } from 'next';
import { themes } from '@boramarcar/tokens';
import { Analytics } from '@vercel/analytics/next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { ConsentBanner } from '@/components/consent-banner';
import { SessionInsights } from '@/components/session-insights';
import { CONSENT_COOKIE, parseConsent } from '@/lib/consent';
import { sessionInsightsEnabled } from '@/lib/session-insights';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import './globals.css';
import '@/styles/mana.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: { default: t('appName'), template: `%s · ${t('appName')}` },
    description: t('tagline'),
    // O Safari/Chrome do iPhone transformava nomes ("Monteiro" é uma cidade), datas e números
    // em links de mapa, agenda e telefone. Endereços e datas reais já têm os nossos links.
    formatDetection: { telephone: false, date: false, address: false, email: false, url: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themes.light.canvas },
    { media: '(prefers-color-scheme: dark)', color: themes.dark.canvas },
  ],
};

/** Aplica o tema salvo (claro/escuro) antes da primeira pintura, sem piscar. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('common');
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  // O aviso de cookies só existe quando há algo não essencial para aceitar (a gravação de
  // sessões, só em produção); o Vercel Analytics não usa cookies.
  const insights = sessionInsightsEnabled();
  return (
    // `data-theme` é definido pelo script antes da hidratação (preferência salva no navegador).
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#conteudo" className="skip-link">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>
          {children}
          {insights && <ConsentBanner initial={consent} />}
          <SessionInsights enabled={insights} consent={consent} />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
