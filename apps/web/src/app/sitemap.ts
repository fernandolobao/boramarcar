import type { MetadataRoute } from 'next';

const base = () => process.env.BETTER_AUTH_URL ?? 'https://www.arcanakin.com.br';

/** Páginas públicas e indexáveis (o resto exige login ou é pessoal, como convites). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base()}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base()}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
