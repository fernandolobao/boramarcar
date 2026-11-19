import { citiesWithStores, getMunicipality } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DiscoveryView } from '@/components/discovery/discovery-view';
import { Logo } from '@/components/logo';
import { getBaseUrl } from '@/env';
import { getDb } from '@/server/db';
import { discoveryFor } from '@/server/discovery';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ uf: string; cidade: string }> };

/** Só municípios com loja própria têm página (sem páginas vazias ou repetidas para o Google). */
async function load(uf: string, slug: string) {
  const db = getDb();
  const city = await getMunicipality(db, { uf, slug });
  if (!city) return null;
  const withStores = await citiesWithStores(db);
  if (!withStores.some((c) => c.code === city.code)) return null;
  return city;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade } = await params;
  const city = await load(uf, cidade);
  if (!city) return pageMetadata({ section: 'discovery', path: `/lojas/em/${uf}/${cidade}` });
  const t = await getTranslations('discovery');
  const name = `${city.name}, ${city.uf}`;
  return pageMetadata({
    section: 'discovery',
    path: `/lojas/em/${city.uf.toLowerCase()}/${city.slug}`,
    title: t('titleCity', { city: name }),
    description: t('metaDescription', { city: name }),
    index: true,
  });
}

/** Lojas e eventos de uma cidade com loja (10.3): pública, indexável e com dados estruturados. */
export default async function CityDiscoveryPage({ params }: Props) {
  const { uf, cidade } = await params;
  const city = await load(uf, cidade);
  if (!city) notFound();
  const [t, tc] = await Promise.all([getTranslations('discovery'), getTranslations('common')]);
  const { data } = await discoveryFor(getDb(), city);
  const base = getBaseUrl();
  // Dados estruturados (schema.org) para os buscadores: as lojas e os eventos da cidade.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      ...data.stores.map((s) => ({
        '@type': 'Store',
        name: s.name,
        url: `${base}/lojas/${s.slug}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: s.municipality.name,
          addressRegion: s.municipality.uf,
          addressCountry: 'BR',
        },
      })),
      ...data.events.map((e) => ({
        '@type': 'Event',
        name: e.title,
        startDate: e.startsAt,
        url: `${base}/lojas/${e.store.slug}/eventos/${e.id}`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: e.store.name,
          address: `${e.store.municipality.name}, ${e.store.municipality.uf}`,
        },
      })),
    ],
  };

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <script
        type="application/ld+json"
        // Texto JSON (não é código executado); `<` escapado para não fechar a tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Link
        href="/"
        className="self-start rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>
      <div className="space-y-2">
        <h1 className="page-title">{t('titleCity', { city: `${city.name}, ${city.uf}` })}</h1>
        <p className="muted">{t('intro')}</p>
      </div>
      <DiscoveryView
        key={city.code}
        city={{ code: city.code, name: city.name, uf: city.uf, slug: city.slug }}
        data={data}
      />
    </main>
  );
}
