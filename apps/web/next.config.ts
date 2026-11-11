import type { NextConfig } from 'next';
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cards.scryfall.io' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
