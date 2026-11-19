import {
  getStoreEventForStaff,
  getStoreEventPublic,
  getStoreEventTournament,
} from '@boramarcar/db';
import { isDomainError } from '@boramarcar/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { StoreEventStaff, StoreTournamentStart } from '@/components/stores/store-events';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ slug: string; id: string }> };

async function load(slug: string, id: string) {
  const user = await requireUser();
  const db = getDb();
  const event = await getStoreEventPublic(db, { eventId: id });
  if (!event || event.store.slug !== slug) notFound();
  const staff = await getStoreEventForStaff(db, { eventId: id, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
        notFound();
      throw error;
    },
  );
  const tournament = await getStoreEventTournament(db, { eventId: id, viewerId: user.id });
  return { event, staff, tournament };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const { event } = await load(slug, id);
  const t = await getTranslations('storeEvents');
  return pageMetadata({
    section: 'group',
    path: `/lojas/${slug}/eventos/${id}/gerenciar`,
    title: t('manageTitle', { title: event.title }),
    description: t('manageMetaDescription'),
  });
}

/** Evento de loja, visão da equipe (10.2a): código do balcão, inscrições, check-in e convidados. */
export default async function ManageStoreEventPage({ params }: Props) {
  const { slug, id } = await params;
  const { event, staff, tournament } = await load(slug, id);
  const [t, format] = await Promise.all([getTranslations('storeEvents'), getFormatter()]);
  const cancelled = event.status === 'cancelled';
  return (
    <>
      <div className="space-y-2">
        <h1 className="page-title">{t('manageTitle', { title: event.title })}</h1>
        <p className="muted">
          {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
          {cancelled && ` · ${t('cancelled')}`}
        </p>
        <Link href={`/lojas/${slug}/eventos/${id}`} className="btn-secondary">
          <Icon name="share" />
          {t('viewPublic')}
        </Link>
      </div>
      {!cancelled && (
        <section className="card space-y-2" aria-labelledby="evento-codigo">
          <h2 id="evento-codigo" className="section-title mb-0">
            {t('code')}
          </h2>
          <p className="font-mono text-4xl font-bold tracking-[0.3em]">{staff.code}</p>
          <p className="muted text-sm">{t('codeHint')}</p>
        </section>
      )}
      {event.kind === 'tournament' && !cancelled && (
        <section className="card space-y-3" aria-labelledby="evento-torneio">
          <h2 id="evento-torneio" className="section-title mb-0">
            {t('tournamentTitle')}
          </h2>
          {tournament ? (
            <Link href={`/lojas/${slug}/eventos/${id}#torneio`} className="btn-primary">
              <Icon name="ranking" />
              {t('followTournament')}
            </Link>
          ) : (
            <StoreTournamentStart
              eventId={id}
              checkedIn={
                staff.entries.filter((e) => e.status === 'registered' && e.checkedInAt).length
              }
              publicHref={`/lojas/${slug}/eventos/${id}#torneio`}
            />
          )}
        </section>
      )}
      <StoreEventStaff
        eventId={id}
        slug={slug}
        cancelled={cancelled}
        entries={staff.entries.map((e) => ({
          id: e.id,
          name: e.name,
          guest: e.guest,
          status: e.status,
          checkedIn: Boolean(e.checkedInAt),
        }))}
        initial={{
          capacity: event.capacity,
          prizes: event.prizes ?? '',
          rules: event.rules ?? '',
        }}
      />
    </>
  );
}
