import { getPublicTournament, getStoreEventPublic } from '@boramarcar/db';
import { PublicTopBar } from '@/components/public-top-bar';
import { isGameFormat } from '@boramarcar/core';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { AutoRefresh } from '@/components/auto-refresh';
import { Icon } from '@/components/icons';
import { ShareButtons } from '@/components/share-buttons';
import { TournamentLive } from '@/components/tournaments/tournament-live';
import { getDb } from '@/server/db';
import { tournamentPublicUrl } from '@/server/email';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const view = await getPublicTournament(getDb(), id).catch(() => null);
  if (!view) notFound();
  // Torneio de loja: já é público na página do evento.
  if (view.tournament.storeEventId) {
    const event = await getStoreEventPublic(getDb(), { eventId: view.tournament.storeEventId });
    if (event) redirect(`/lojas/${event.store.slug}/eventos/${event.id}#torneio`);
  }
  return view;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const view = await getPublicTournament(getDb(), id).catch(() => null);
  if (!view) return pageMetadata({ section: 'tournament', path: `/torneio/${id}` });
  const [t, tf] = await Promise.all([getTranslations('tournaments'), getTranslations('formats')]);
  return pageMetadata({
    section: 'tournament',
    path: `/torneio/${id}`,
    title: view.tournament.name,
    description: `${tf(isGameFormat(view.tournament.format) ? view.tournament.format : 'other')} · ${t(`status.${view.tournament.status as 'running'}`)} · ${t('entrantsCount', { count: view.entrants.length })}`,
  });
}

/**
 * Torneio aberto a quem tem o link (9.5): rodadas, mesas, classificação e linha do tempo, ao vivo
 * enquanto roda. Só primeiros nomes; nada de grupo, local, e-mail ou foto.
 */
export default async function PublicTournamentPage({ params }: Props) {
  const { id } = await params;
  const view = await load(id);
  const [t, tf, , format, signedIn] = await Promise.all([
    getTranslations('tournaments'),
    getTranslations('formats'),
    getTranslations('common'),
    getFormatter(),
    getSessionUser(await headers())
      .then(Boolean)
      .catch(() => false),
  ]);
  const tour = view.tournament;
  const url = tournamentPublicUrl(tour.id);
  const running = tour.status === 'running';

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      {running && <AutoRefresh />}
      <PublicTopBar />

      <div className="space-y-2">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
          {running ? t('public.live') : t(`status.${tour.status as 'finished'}`)}
        </p>
        <h1 className="page-title">{tour.name}</h1>
        <p className="muted">
          {tf(isGameFormat(tour.format) ? tour.format : 'other')} ·{' '}
          {t('entrantsCount', { count: view.entrants.length })}
          {view.event ? ` · ${format.dateTime(view.event.startsAt, { dateStyle: 'full' })}` : ''}
        </p>
        {running && <p className="muted text-sm">{t('public.liveHint')}</p>}
      </div>

      <div className="space-y-6">
        <TournamentLive view={view} viewerId={null} tableMode={false} deletable={false} />
      </div>

      <section className="card space-y-3" aria-labelledby="torneio-compartilhar">
        <h2 id="torneio-compartilhar" className="section-title mb-0">
          {t('public.share')}
        </h2>
        <ShareButtons
          text={t('public.shareText', { name: tour.name, url })}
          url={url}
          title={tour.name}
        />
      </section>

      {!signedIn && (
        <div className="space-y-2">
          <p>{t('public.cta')}</p>
          <Link href="/" className="btn-primary self-start">
            <Icon name="next" />
            {t('public.ctaButton')}
          </Link>
        </div>
      )}
    </main>
  );
}
