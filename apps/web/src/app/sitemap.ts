import type { MetadataRoute } from 'next';
import { LESSON_IDS } from '@boramarcar/core/learn';
import { citiesWithStores } from '@boramarcar/db';
import { getDb } from '@/server/db';

/**
 * Lido do banco a cada pedido (a lista de cidades muda quando entra loja nova). Gerar no build
 * congelaria a lista do momento do build; só buscadores leem este arquivo.
 */
export const dynamic = 'force-dynamic';

const base = () => process.env.BETTER_AUTH_URL ?? 'https://www.arcanakin.com.br';

/**
 * Páginas públicas e indexáveis (o resto exige login ou é pessoal, como convites). Lojas e
 * eventos (10.3): `/lojas` e uma página por cidade com loja própria.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await citiesWithStores(getDb()).catch(() => []);
  return [
    { url: `${base()}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base()}/lojas`, changeFrequency: 'daily', priority: 0.8 },
    ...cities.map((c) => ({
      url: `${base()}/lojas/em/${c.uf.toLowerCase()}/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    { url: `${base()}/aprender`, changeFrequency: 'monthly', priority: 0.7 },
    ...LESSON_IDS.map((id) => ({
      url: `${base()}/aprender/${id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${base()}/ajuda`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base()}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
