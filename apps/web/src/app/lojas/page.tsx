import { citiesWithStores, getUserPreferences } from '@boramarcar/db';
import { PublicTopBar } from '@/components/public-top-bar';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { DiscoveryView } from '@/components/discovery/discovery-view';
import { CITY_COOKIE } from '@/lib/discovery';
import { getDb } from '@/server/db';
import { cityFromParam, discoveryFor } from '@/server/discovery';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { searchParams: Promise<{ cidade?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ section: 'discovery', path: '/lojas', index: true });
}

/**
 * Lojas e eventos perto de você (10.3), sem login: pela cidade (do parâmetro ou a guardada no
 * cookie) ou, no navegador, pela localização. Sem cidade, pede a cidade e lista as que têm loja.
 */
export default async function DiscoveryPage({ searchParams }: Props) {
  const { cidade } = await searchParams;
  const db = getDb();
  // Ordem: a cidade do endereço, a escolhida antes (cookie) e, para quem entrou, a do perfil.
  const fromCookie = cidade ?? (await cookies()).get(CITY_COOKIE)?.value;
  const session = fromCookie ? null : await getSessionUser(await headers()).catch(() => null);
  const profileCity = session
    ? (await getUserPreferences(db, session.id).catch(() => null))?.city
    : null;
  const city = fromCookie
    ? await cityFromParam(db, fromCookie)
    : profileCity
      ? await cityFromParam(db, `${profileCity.uf}/${profileCity.slug}`)
      : null;
  const t = await getTranslations('discovery');
  const found = city ? await discoveryFor(db, city) : null;
  const cities = city ? [] : await citiesWithStores(db);

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <PublicTopBar />
      <div className="space-y-2">
        <h1 className="page-title">
          {city ? t('titleCity', { city: `${city.name}, ${city.uf}` }) : t('title')}
        </h1>
        <p className="muted">{city ? t('intro') : t('pickCity')}</p>
      </div>
      {/* `key`: outra cidade monta a lista de novo (o estado dos filtros e da localização zera). */}
      <DiscoveryView
        key={city?.code ?? 'sem-cidade'}
        city={city ? { code: city.code, name: city.name, uf: city.uf, slug: city.slug } : null}
        data={found?.data ?? null}
        nearest={found?.nearest ?? []}
      />
      {!city && cities.length > 0 && (
        <section className="card space-y-3" aria-labelledby="descoberta-cidades">
          <h2 id="descoberta-cidades" className="section-title mb-0">
            {t('citiesWithStores')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.code}>
                <Link href={`/lojas/em/${c.uf.toLowerCase()}/${c.slug}`} className="btn-secondary">
                  {c.name}, {c.uf}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
