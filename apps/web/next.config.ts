import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Os pacotes do monorepo são consumidos direto do código-fonte TypeScript.
  transpilePackages: ['@boramarcar/core', '@boramarcar/db', '@boramarcar/tokens'],
  serverExternalPackages: ['pg'],
  // Endereço antigo (Vercel) e domínio sem "www" levam ao endereço oficial, mantendo o caminho.
  async redirects() {
    return ['boramarcar-zeta.vercel.app', 'arcanakin.com.br'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: 'https://www.arcanakin.com.br/:path*',
      permanent: true,
    }));
  },
  // Cabeçalhos de segurança em tudo (a CSP, que muda a cada página, vem do `proxy.ts`).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cards.scryfall.io' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

/**
 * Sentry (erros do site): só envia algo quando `NEXT_PUBLIC_SENTRY_DSN` existe. Os eventos passam
 * pelo próprio site (`/monitoring`), então a CSP não precisa liberar o Sentry e bloqueadores não
 * cortam o envio. Mapas de código só sobem com `SENTRY_AUTH_TOKEN` (build da Vercel).
 */
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
