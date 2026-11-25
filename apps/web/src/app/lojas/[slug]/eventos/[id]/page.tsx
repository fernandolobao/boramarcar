import { isGameFormat } from '@boramarcar/core';
import { PublicTopBar } from '@/components/public-top-bar';
import { getStoreEventPublic, getStoreEventTournament, listMyStores } from '@boramarcar/db';
import type { Metadata } from 'next';
import { googleCalendarUrl } from '@boramarcar/core/calendar';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { StoreEventRegistration } from '@/components/stores/store-events';
import { TournamentLive } from '@/components/tournaments/tournament-live';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ slug: string; id: string }> };

async function load(slug: string, id: string, viewerId?: string | null) {
  const event = await getStoreEventPublic(getDb(), { eventId: id, viewerId }).catch(() => null);
  return event && event.store.slug === slug ? event : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const path = `/lojas/${slug}/eventos/${id}`;
  const event = await load(slug, id);
  if (!event) return pageMetadata({ section: 'group', path });
  const [t, tf] = await Promise.all([getTranslations('storeEvents'), getTranslations('formats')]);
  return pageMetadata({
    section: 'group',
    path,
    title: `${event.title} · ${event.store.name}`,
    description: t('metaDescription', {
      title: event.title,
      store: event.store.name,
      kind: t(`kind.${event.kind as 'tournament' | 'casual'}`).toLowerCase(),
      format: tf(isGameFormat(event.format) ? event.format : 'other'),
    }),
    index: true,
  });
}

/**
 * Evento de loja (10.2a), público: quando, formato, vagas (contagem, sem nomes), premiação e
 * regras. Com login, a pessoa se inscreve ou desiste; a equipe vê o atalho para gerenciar.
 */
export default async function StoreEventPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await getSessionUser(await headers()).catch(() => null);
  const event = await load(slug, id, session?.id);
  if (!event) notFound();
  const [td, t, tf, tc, format, staff, tournament] = await Promise.all([
    getTranslations('discovery'),
    getTranslations('storeEvents'),
    getTranslations('formats'),
    getTranslations('common'),
    getFormatter(),
    session
      ? listMyStores(getDb(), { userId: session.id }).then((s) => s.some((x) => x.slug === slug))
      : false,
    getStoreEventTournament(getDb(), { eventId: id, viewerId: session?.id ?? null }),
  ]);
  const cancelled = event.status === 'cancelled';
  const formatName = tf(isGameFormat(event.format) ? event.format : 'other');

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <PublicTopBar />
      <div className="space-y-2">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
          {t(`kind.${event.kind as 'tournament' | 'casual'}`)} · {formatName}
        </p>
        <h1 className="page-title">{event.title}</h1>
        <p>
          <Link href={`/lojas/${slug}`} className="underline underline-offset-2">
            {event.store.name}
          </Link>
        </p>
        <p className="text-lg">
          <span className="sr-only">{t('when')}: </span>
          {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        {cancelled && (
          <p role="status" className="font-semibold text-danger">
            {t('eventCancelled')}
          </p>
        )}
        {/* "Adicionar à agenda" (10.3): arquivo .ics ou Google Agenda, sem precisar de conta. */}
        {event.status === 'scheduled' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <a className="btn-secondary" href={`/api/v1/store-events/${event.id}/ics`} download>
              <Icon name="addToCalendar" />
              {td('ics')}
            </a>
            <a
              className="btn-secondary"
              target="_blank"
              rel="noreferrer"
              href={googleCalendarUrl({
                uid: event.id,
                title: `${event.title} · ${event.store.name}`,
                start: event.startsAt,
                end: event.endsAt,
                location: event.store.name,
              })}
            >
              {td('google')}
              <span className="sr-only"> {tc('newTab')}</span>
            </a>
          </div>
        )}
      </div>

      <section className="card space-y-3" aria-labelledby="evento-vagas">
        <h2 id="evento-vagas" className="sr-only">
          {t('entries')}
        </h2>
        <p className="text-lg font-semibold tabular-nums">
          {event.capacity
            ? t('spots', { registered: event.registered, capacity: event.capacity })
            : t('spotsOpen', { registered: event.registered })}
          {event.waitlist > 0 && (
            <span className="muted text-base font-normal">
              {' · '}
              {t('waitlistCount', { count: event.waitlist })}
            </span>
          )}
        </p>
        {tournament && <p className="muted">{t('registrationClosed')}</p>}
        {!cancelled &&
          !tournament &&
          (session ? (
            <StoreEventRegistration eventId={event.id} myEntry={event.myEntry} />
          ) : (
            <Link
              href={`/entrar?para=${encodeURIComponent(`/lojas/${slug}/eventos/${id}`)}`}
              className="btn-primary"
            >
              {t('signInToRegister')}
            </Link>
          ))}
        {staff && (
          <Link href={`/lojas/${slug}/eventos/${id}/gerenciar`} className="btn-secondary">
            <Icon name="edit" />
            {t('manageEvent')}
          </Link>
        )}
      </section>

      {/* Torneio do evento (10.2b): mesas, classificação e linha do tempo, ao vivo para todos. */}
      {tournament && (
        <div id="torneio" className="space-y-6 scroll-mt-4">
          <h2 className="section-title mb-0">{t('tournamentTitle')}</h2>
          <TournamentLive
            view={tournament}
            viewerId={session?.id ?? null}
            tableMode={false}
            deletable={false}
          />
        </div>
      )}

      {event.prizes && (
        <section className="card space-y-2" aria-labelledby="evento-premiacao">
          <h2 id="evento-premiacao" className="section-title mb-0">
            {t('prizes')}
          </h2>
          <p className="whitespace-pre-line">{event.prizes}</p>
        </section>
      )}
      {event.rules && (
        <section className="card space-y-2" aria-labelledby="evento-regras">
          <h2 id="evento-regras" className="section-title mb-0">
            {t('rules')}
          </h2>
          <p className="whitespace-pre-line">{event.rules}</p>
        </section>
      )}
    </main>
  );
}
