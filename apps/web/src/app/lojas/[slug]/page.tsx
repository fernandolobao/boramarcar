import { isGameFormat } from '@boramarcar/core';
import { getStorePublic, listMyStores } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { StoreMap } from '@/components/stores/store-map';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ slug: string }> };

const load = (slug: string) => getStorePublic(getDb(), { slug }).catch(() => null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await load(slug);
  if (!store) return pageMetadata({ section: 'group', path: `/lojas/${slug}` });
  const t = await getTranslations('stores');
  return pageMetadata({
    section: 'group',
    path: `/lojas/${slug}`,
    title: store.name,
    description: t('metaDescription', { name: store.name, city: store.city }),
    // A loja quer ser encontrada: o perfil público vai para os buscadores.
    index: true,
  });
}

/**
 * Perfil público da loja (10.1): aberto para quem tem o link (e para buscadores). Sem o e-mail de
 * contato. Quem é da equipe vê o atalho para gerenciar.
 */
export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = await load(slug);
  if (!store) notFound();
  const [t, tf, tc, session] = await Promise.all([
    getTranslations('stores'),
    getTranslations('formats'),
    getTranslations('common'),
    getSessionUser(await headers()).catch(() => null),
  ]);
  const mine = session
    ? (await listMyStores(getDb(), { userId: session.id })).some((s) => s.slug === slug)
    : false;
  const initials = store.name
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  const contacts = [
    store.instagram && {
      key: 'instagram',
      label: `${t('instagram')}: @${store.instagram}`,
      href: `https://www.instagram.com/${store.instagram}/`,
    },
    store.whatsapp && {
      key: 'whatsapp',
      label: t('whatsapp'),
      href: `https://wa.me/${store.whatsapp}`,
    },
    store.website && {
      key: 'website',
      label: `${t('website')}: ${new URL(store.website).hostname}`,
      href: store.website,
    },
  ].filter((c): c is { key: string; label: string; href: string } => Boolean(c));

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <Link
        href="/"
        className="self-start rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>

      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-arcano font-display text-2xl font-semibold text-pergaminho"
        >
          {initials}
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="page-title">{store.name}</h1>
          <p className="muted">{store.city}</p>
          {store.verified && (
            <p
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-on-accent"
              title={t('verifiedHint')}
            >
              <Icon name="done" />
              {t('verified')}
            </p>
          )}
        </div>
      </header>

      {mine && (
        <Link href={`/lojas/${slug}/gerenciar`} className="btn-secondary self-start">
          <Icon name="edit" />
          {t('manage')}
        </Link>
      )}

      {store.about && (
        <section className="card space-y-2" aria-labelledby="loja-sobre">
          <h2 id="loja-sobre" className="section-title mb-0">
            {t('about')}
          </h2>
          <p className="whitespace-pre-line">{store.about}</p>
        </section>
      )}

      {(store.address || store.hours) && (
        <section className="card space-y-3" aria-labelledby="loja-onde">
          <h2 id="loja-onde" className="section-title mb-0">
            {t('where')}
          </h2>
          {store.address && <p>{store.address}</p>}
          {store.hours && (
            <p>
              <span className="font-semibold">{t('hours')}:</span> {store.hours}
            </p>
          )}
          {store.lat !== null && store.lng !== null && (
            <StoreMap
              name={store.name}
              address={store.address}
              lat={store.lat}
              lng={store.lng}
              label={t('where')}
            />
          )}
        </section>
      )}

      {(contacts.length > 0 || store.formats.length > 0) && (
        <section className="card space-y-4" aria-labelledby="loja-contatos">
          <h2 id="loja-contatos" className="section-title mb-0">
            {t('contacts')}
          </h2>
          {contacts.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {contacts.map((c) => (
                <li key={c.key}>
                  <a href={c.href} target="_blank" rel="noreferrer" className="btn-secondary">
                    {c.label}
                    <span className="sr-only"> {tc('newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {store.formats.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">{t('formats')}</h3>
              <ul className="flex flex-wrap gap-2">
                {store.formats.filter(isGameFormat).map((f) => (
                  <li key={f} className="rounded-full bg-surface-muted px-3 py-1 text-sm">
                    {tf(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card space-y-2" aria-labelledby="loja-eventos">
        <h2 id="loja-eventos" className="section-title mb-0">
          {t('events')}
        </h2>
        <p className="muted">{t('eventsSoon')}</p>
      </section>

      {!session && (
        <div className="space-y-2">
          <p>{t('cta')}</p>
          <Link href="/" className="btn-primary">
            {t('ctaButton')}
          </Link>
        </div>
      )}
    </main>
  );
}
