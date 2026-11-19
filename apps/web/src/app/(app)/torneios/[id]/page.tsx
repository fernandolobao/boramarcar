import { getStoreEventPublic, getTournament, listMembers } from '@boramarcar/db';
import { isDomainError, isGameFormat } from '@boramarcar/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { TournamentEntrants } from '@/components/tournaments/tournament-actions';
import { CopyField, ShareButtons } from '@/components/share-buttons';
import { TournamentLive } from '@/components/tournaments/tournament-live';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { tournamentPublicUrl } from '@/server/email';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const user = await requireUser();
  const view = await getTournament(getDb(), { tournamentId: id, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
        notFound();
      throw error;
    },
  );
  // Torneio de loja (10.2b): quem acompanha é a página do evento da loja.
  if (view.tournament.storeEventId) {
    const event = await getStoreEventPublic(getDb(), { eventId: view.tournament.storeEventId });
    if (event) redirect(`/lojas/${event.store.slug}/eventos/${event.id}#torneio`);
  }
  return { user, view };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { view } = await load(id);
  const [t, tf] = await Promise.all([getTranslations('tournaments'), getTranslations('formats')]);
  return pageMetadata({
    section: 'group',
    path: `/torneios/${id}`,
    title: view.tournament.name,
    description: `${tf(isGameFormat(view.tournament.format) ? view.tournament.format : 'other')} · ${t(`status.${view.tournament.status as 'running'}`)} · ${t('entrantsCount', { count: view.entrants.length })}`,
  });
}

/** Página do torneio (9.1): inscrições, rodadas e mesas, classificação e linha do tempo. */
export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  const { user, view } = await load(id);
  const db = getDb();
  const [members, t, tf, format] = await Promise.all([
    view.tournament.groupId ? listMembers(db, view.tournament.groupId) : [],
    getTranslations('tournaments'),
    getTranslations('formats'),
    getFormatter(),
  ]);
  const tour = view.tournament;
  const bestOfLabel = t('bestOfOption', { count: tour.bestOf });

  return (
    <>
      <div className="space-y-1">
        <h1 className="page-title">{tour.name}</h1>
        <p className="muted">
          {t('summary', {
            format: tf(isGameFormat(tour.format) ? tour.format : 'other'),
            bestOf: bestOfLabel,
            event: view.event?.title ?? '',
          })}{' '}
          ·{' '}
          <Link href={`/eventos/${tour.eventId}`} className="underline underline-offset-2">
            {view.event ? format.dateTime(view.event.startsAt, { dateStyle: 'medium' }) : ''}
          </Link>
        </p>
        <p>
          <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-sm font-medium">
            {t(`status.${tour.status as 'registration' | 'running' | 'finished'}`)}
          </span>
        </p>
      </div>

      {/* Seções comuns (sem o empilhamento ao rolar): as mesas têm formulários e mudam de altura. */}
      <div className="mt-6 space-y-6">
        {tour.status === 'registration' && (
          <section className="card" aria-labelledby="torneio-inscricoes">
            <h2 id="torneio-inscricoes" className="section-title">
              {t('entrants')} · {t('entrantsCount', { count: view.entrants.length })}
            </h2>
            <TournamentEntrants
              tournamentId={tour.id}
              entrantSize={tour.entrantSize}
              entrants={view.entrants}
              members={members.map((m) => ({ userId: m.userId, name: m.name }))}
              me={user.id}
              canManage={view.canManage}
            />
          </section>
        )}

        <TournamentLive view={view} viewerId={user.id} tableMode={Boolean(tour.eventId)} />

        {/* Link público (9.5): para quem não é do grupo acompanhar, só com primeiros nomes. */}
        {tour.status !== 'registration' && (
          <section className="card space-y-3" aria-labelledby="torneio-link">
            <h2 id="torneio-link" className="section-title mb-0">
              {t('public.link')}
            </h2>
            <p className="muted text-sm">{t('public.linkHint')}</p>
            <CopyField label={t('public.link')} value={tournamentPublicUrl(tour.id)} />
            <ShareButtons
              text={t('public.shareText', { name: tour.name, url: tournamentPublicUrl(tour.id) })}
              url={tournamentPublicUrl(tour.id)}
              title={tour.name}
              copy={false}
            />
          </section>
        )}
      </div>
    </>
  );
}
