import type { Metadata } from 'next';
import {
  getEventDetail,
  getGroupSettings,
  listDecksForUsers,
  listLocations,
  listMembers,
} from '@boramarcar/db';
import { formatRules, isGameFormat } from '@boramarcar/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DeleteButton } from '@/components/availability-forms';
import { RsvpButtons } from '@/components/event-forms';
import { GameEditor } from '@/components/game-editor';
import { GameForm } from '@/components/game-form';
import { GamePlayers } from '@/components/game-players';
import { EventManage, EventStatusBadge } from '@/components/event-manage';
import { ShareButtons } from '@/components/share-buttons';
import { Icon } from '@/components/icons';
import { DirectionsLinks } from '@/components/places/directions';
import { LocationMap } from '@/components/places/location-map';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { buildEventShareText, eventUrl } from '@/server/event-share';
import { isDomainError } from '@boramarcar/core';
import { PlayerLink, PlayerLinks } from '@/components/player-link';
import { StackSections } from '@/components/stack-sections';
import { EmptyState } from '@/components/empty-state';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ id: string }> };

/** Título da aba com o nome do encontro (WCAG 2.4.2). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const event = await getEventDetail(getDb(), { eventId: id, userId: user.id }).catch(() => null);
  return pageMetadata({
    section: 'event',
    path: `/eventos/${id}`,
    title: event?.title ?? (await getTranslations('nav'))('events'),
  });
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const db = getDb();
  const event = await getEventDetail(db, { eventId: id, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
        notFound();
      throw error;
    },
  );
  const [members, locations, shareText, settings] = await Promise.all([
    listMembers(db, event.groupId),
    listLocations(db, event.groupId),
    buildEventShareText(event),
    getGroupSettings(db, { groupId: event.groupId, userId: user.id }),
  ]);
  const decks = await listDecksForUsers(
    db,
    members.map((m) => m.userId),
  );
  const t = await getTranslations('events');
  const tc = await getTranslations('common');
  const tp = await getTranslations('places');
  const tt = await getTranslations('table');
  const tf = await getTranslations('formats');
  const tr = await getTranslations('recap');
  const format = await getFormatter();

  const me = event.participants.find((p) => p.userId === user.id);
  // Participantes confirmados primeiro, depois os demais membros.
  const ordered = [
    ...event.participants.filter((p) => p.rsvp === 'yes'),
    ...members.filter(
      (m) => !event.participants.some((p) => p.userId === m.userId && p.rsvp === 'yes'),
    ),
  ];
  const players = ordered.map((p) => ({
    userId: p.userId,
    name: p.name,
    decks: decks.filter((d) => d.ownerId === p.userId).map((d) => ({ id: d.id, name: d.name })),
  }));

  // Arte para o topo: o deck de quem venceu a última partida (ou de quem jogou).
  const played = [...event.games].reverse().flatMap((g) => g.players);
  const heroArt =
    played.find((p) => p.result === 'win' && p.deck?.artUri)?.deck?.artUri ??
    played.find((p) => p.deck?.artUri)?.deck?.artUri ??
    null;

  return (
    <>
      {heroArt ? (
        // Com partidas: a arte do deck vencedor (ou de quem jogou) no topo, tingida na cor da
        // marca; o texto fica sobre uma camada escura que garante o contraste com qualquer arte.
        <div className="relative isolate overflow-hidden rounded-3xl bg-arcano p-6 text-pergaminho sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-[50%_30%] mix-blend-luminosity"
            style={{ backgroundImage: `url(${JSON.stringify(heroArt)})` }}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-arcano/80" />
          <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {event.title} <EventStatusBadge status={event.status} />
          </h1>
          <p className="mt-1 text-ink-200">
            {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
            {event.location?.name ?? tc('locationTbd')}
            {event.location?.address && ` (${event.location.address})`}
          </p>
        </div>
      ) : (
        <div>
          <h1 className="page-title flex flex-wrap items-center gap-3">
            {event.title} <EventStatusBadge status={event.status} />
          </h1>
          <p className="muted">
            {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
            {event.location?.name ?? tc('locationTbd')}
            {event.location?.address && ` (${event.location.address})`}
          </p>
        </div>
      )}

      {event.status === 'cancelled' && (
        <p
          role="status"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {t('cancelledNotice')}
        </p>
      )}

      {/* Seções em pilha de cartas: cada uma desliza por cima da anterior ao rolar. */}
      <StackSections>
        {event.location && (
          <section className="card space-y-3" aria-labelledby="event-location-title">
            <h2 id="event-location-title" className="section-title mb-0">
              {tp('where')}: {event.location.name}
            </h2>
            {event.location.address && <p className="text-sm">{event.location.address}</p>}
            {event.location.details && <p className="muted text-sm">{event.location.details}</p>}
            {event.location.lat !== null && event.location.lng !== null && (
              <LocationMap
                points={[
                  {
                    id: event.location.id,
                    name: event.location.name,
                    lat: event.location.lat,
                    lng: event.location.lng,
                  },
                ]}
                label={tp('mapOf', { name: event.location.name })}
                className="h-56"
              />
            )}
            <DirectionsLinks place={event.location} />
          </section>
        )}

        <section className="card space-y-3">
          <h2 className="section-title">{t('share')}</h2>
          <ShareButtons
            text={shareText}
            url={eventUrl(event.id)}
            title={event.title}
            icsHref={`/api/v1/events/${event.id}/ics`}
          />
          {event.status === 'finished' && event.games.length > 0 && (
            <div className="space-y-1 border-t border-line pt-3">
              <Link href={`/resumo/${event.id}`} className="btn-secondary">
                <Icon name="ranking" />
                {tr('link')}
              </Link>
              <p className="muted">{tr('linkHint')}</p>
            </div>
          )}
        </section>

        <section className="card space-y-4">
          <h2 className="section-title">{t('participants')}</h2>
          <RsvpButtons eventId={event.id} current={me?.rsvp ?? null} />
          <ul className="flex flex-wrap gap-2">
            {event.participants.map((p) => (
              <li
                key={p.userId}
                className="rounded-full bg-ink-100 px-3 py-1 text-sm dark:bg-ink-800"
              >
                <PlayerLink userId={p.userId} name={p.name} /> ·{' '}
                <span className="muted">{t(`rsvp.${p.rsvp}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">{t('games')}</h2>
          {event.games.length === 0 ? (
            <EmptyState>{t('noGames')}</EmptyState>
          ) : (
            <ol className="space-y-4">
              {event.games.map((game) => {
                const format = isGameFormat(game.format) ? game.format : 'other';
                const summary = [
                  game.firstPlayerName && t('firstSummary', { name: game.firstPlayerName }),
                  game.winningTurn && t('turnSummary', { turn: game.winningTurn }),
                  game.durationMinutes && t('durationSummary', { minutes: game.durationMinutes }),
                ].filter(Boolean);
                return (
                  <li
                    key={game.id}
                    className="rounded-xl border border-ink-200 p-4 dark:border-ink-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">
                          {t('game', { number: game.number })}{' '}
                          <span className="ms-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                            {tf(format)}
                          </span>
                        </h3>
                        <p className="mt-0.5 text-sm">
                          {game.isDraw ? (
                            t('draw')
                          ) : (
                            <>
                              {t('winnersLabel', { count: game.winners.length })}{' '}
                              <PlayerLinks players={game.winners} />
                            </>
                          )}
                        </p>
                        {summary.length > 0 && (
                          <p className="muted text-sm">{summary.join(' · ')}</p>
                        )}
                      </div>
                      {game.canEdit && (
                        <DeleteButton
                          path={`/api/v1/games/${game.id}`}
                          label={t('removeGame', { number: game.number })}
                        />
                      )}
                    </div>
                    <GamePlayers
                      players={game.players}
                      showTeams={formatRules(format).structure === 'teams'}
                    />
                    {game.notes && <p className="muted mt-2 text-sm">{game.notes}</p>}
                    {game.canEdit && (
                      <GameEditor
                        gameId={game.id}
                        number={game.number}
                        players={players}
                        initial={{
                          format,
                          firstPlayerId: game.firstPlayerId,
                          winningTurn: game.winningTurn,
                          durationMinutes: game.durationMinutes,
                          notes: game.notes,
                          players: game.players.map((p) => ({
                            userId: p.userId,
                            result: p.result,
                            deckId: p.deckId,
                            team: p.team,
                            eliminatedOrder: p.eliminatedOrder,
                          })),
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {event.status !== 'cancelled' && (
          <section className="card">
            <h2 className="section-title">{t('recordGame')}</h2>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 p-4 dark:bg-brand-700/20">
              <Link href={`/mesa/${event.id}`} className="btn-primary">
                <Icon name="table" />
                {tt('open')}
              </Link>
              <p className="text-sm">{tt('openHint')}</p>
            </div>
            <GameForm eventId={event.id} players={players} defaultFormat={settings.defaultFormat} />
          </section>
        )}

        {event.canManage && (
          <section className="card">
            <h2 className="section-title">{t('edit')}</h2>
            <EventManage
              eventId={event.id}
              title={event.title}
              startsAt={event.startsAt.toISOString()}
              endsAt={event.endsAt?.toISOString() ?? null}
              locationId={event.locationId}
              status={event.status}
              locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            />
          </section>
        )}
      </StackSections>
    </>
  );
}
