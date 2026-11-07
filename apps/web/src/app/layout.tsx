import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
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
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

/** Aplica o tema salvo (claro/escuro) antes da primeira pintura, sem piscar. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('common');
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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
