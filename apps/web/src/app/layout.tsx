import type { Metadata, Viewport } from 'next';
import { themes } from '@boramarcar/tokens';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense, type ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { ActivityBar } from '@/components/activity-bar';
import { ConsentBanner } from '@/components/consent-banner';
import { SessionInsights } from '@/components/session-insights';
import { CONSENT_COOKIE, parseConsent } from '@/lib/consent';
import { sessionInsightsEnabled } from '@/lib/session-insights';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { display } from '@/fonts';
import './globals.css';
import '@/styles/mana.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    // URLs absolutas das imagens de compartilhamento (/og): produção ou o preview.
    metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'https://www.arcanakin.com.br'),
    title: { default: t('appName'), template: `%s · ${t('appName')}` },
    description: t('tagline'),
    applicationName: t('appName'),
    // Padrão para páginas sem metadados próprios (cada página usa `server/seo.ts`).
    openGraph: {
      siteName: t('appName'),
      type: 'website',
      title: t('appName'),
      description: t('tagline'),
      images: [{ url: '/og/s/home', width: 1200, height: 630, alt: t('tagline') }],
    },
    twitter: { card: 'summary_large_image', images: ['/og/s/home'] },
    appleWebApp: { title: t('appName'), statusBarStyle: 'black-translucent' },
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
  // Nonce da CSP (proxy.ts) para o único script inline nosso.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // `data-theme` é definido pelo script antes da hidratação (preferência salva no navegador).
    <html lang={locale} className={display.variable} suppressHydrationWarning>
      <head>
        {/* O navegador esconde o atributo nonce depois de ler: sem aviso de hidratação. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body>
        <a href="#conteudo" className="skip-link">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>
          {/* useSearchParams pede um limite de Suspense (não atrasa a página). */}
          <Suspense fallback={null}>
            <ActivityBar />
          </Suspense>
          {children}
          {insights && <ConsentBanner initial={consent} />}
          <SessionInsights enabled={insights} consent={consent} nonce={nonce} />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
