import { getStoreForManager, listStoreEvents } from '@boramarcar/db';
import { isDomainError } from '@boramarcar/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageUpload } from '@/components/image-upload';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { StoreEventForm } from '@/components/stores/store-events';
import { StoreProfileForm, StoreTeam } from '@/components/stores/store-manage';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const user = await requireUser();
  const view = await getStoreForManager(getDb(), { slug, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
        notFound();
      throw error;
    },
  );
  return { user, view };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { view } = await load(slug);
  const t = await getTranslations('stores');
  return pageMetadata({
    section: 'group',
    path: `/lojas/${slug}/gerenciar`,
    title: t('manageTitle', { name: view.store.name }),
    description: t('manageMetaDescription'),
  });
}

/** Gerenciar a loja (10.1): perfil (dono e equipe) e equipe (o dono). */
export default async function ManageStorePage({ params }: Props) {
  const { slug } = await params;
  const { user, view } = await load(slug);
  const s = view.store;
  const [t, te, format, upcoming] = await Promise.all([
    getTranslations('stores'),
    getTranslations('storeEvents'),
    getFormatter(),
    listStoreEvents(getDb(), { storeId: s.id, when: 'upcoming' }),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="page-title">{t('manageTitle', { name: s.name })}</h1>
        <Link href={`/lojas/${slug}`} className="btn-secondary">
          <Icon name="share" />
          {t('viewPublic')}
        </Link>
      </div>
      <section className="card" aria-labelledby="loja-perfil">
        <h2 id="loja-perfil" className="section-title">
          {t('profile')}
        </h2>
        <div className="mb-6">
          <ImageUpload
            kind="logo"
            endpoint={`/api/v1/stores/${s.id}/logo`}
            name={s.name}
            image={s.logoUrl ?? null}
          />
        </div>
        <StoreProfileForm
          store={{
            id: s.id,
            name: s.name,
            city: s.city,
            about: s.about,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            hours: s.hours,
            instagram: s.instagram ? `@${s.instagram}` : null,
            whatsapp: s.whatsapp,
            website: s.website,
            formats: s.formats,
          }}
        />
      </section>
      <section className="card space-y-4" aria-labelledby="loja-eventos">
        <h2 id="loja-eventos" className="section-title mb-0">
          {te('upcoming')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="muted">{te('none')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((ev) => (
              <li key={ev.id} className="py-2">
                <Link
                  href={`/lojas/${slug}/eventos/${ev.id}/gerenciar`}
                  className="font-semibold underline underline-offset-2"
                >
                  {ev.title}
                </Link>
                <p className="muted text-sm">
                  {format.dateTime(ev.startsAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  {ev.status === 'cancelled' && ` · ${te('cancelled')}`}
                </p>
              </li>
            ))}
          </ul>
        )}
        <h3 className="font-semibold">{te('newTitle')}</h3>
        <StoreEventForm storeId={s.id} slug={slug} />
      </section>
      <section className="card" aria-labelledby="loja-equipe">
        <h2 id="loja-equipe" className="section-title">
          {t('team')}
        </h2>
        <StoreTeam
          storeId={s.id}
          isOwner={view.role === 'owner'}
          me={user.id}
          members={view.members}
          invites={view.invites.map((i) => ({
            id: i.id,
            email: i.email,
            expiresAt: i.expiresAt.toISOString(),
          }))}
        />
      </section>
    </>
  );
}
