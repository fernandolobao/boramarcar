import type { MetadataRoute } from 'next';

const base = () => process.env.BETTER_AUTH_URL ?? 'https://www.arcanakin.com.br';

/** Buscadores: só as páginas públicas; a área logada e a API ficam de fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacidade', '/og/'],
      disallow: ['/api/', '/previa/'],
    },
    sitemap: `${base()}/sitemap.xml`,
  };
}
