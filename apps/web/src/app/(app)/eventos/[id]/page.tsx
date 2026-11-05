import { getEventDetail, listDecksForUsers, listMembers } from '@boramarcar/db';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DeleteButton } from '@/components/availability-forms';
import { RecordGameForm, RsvpButtons } from '@/components/event-forms';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { isDomainError } from '@boramarcar/core';

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
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
  const members = await listMembers(db, event.groupId);
  const decks = await listDecksForUsers(
    db,
    members.map((m) => m.userId),
  );
  const t = await getTranslations('events');
  const tc = await getTranslations('common');
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

  return (
    <>
      <div>
        <h1 className="page-title">{event.title}</h1>
        <p className="muted">
          {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
          {event.location?.name ?? tc('locationTbd')}
          {event.location?.address && ` (${event.location.address})`}
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="section-title">{t('participants')}</h2>
        <RsvpButtons eventId={event.id} current={me?.rsvp ?? null} />
        <ul className="flex flex-wrap gap-2">
          {event.participants.map((p) => (
            <li
              key={p.userId}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
            >
              {p.name} · <span className="muted">{t(`rsvp.${p.rsvp}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-title">{t('games')}</h2>
        {event.games.length === 0 ? (
          <p className="muted">{t('noGames')}</p>
        ) : (
          <ol className="space-y-4">
            {event.games.map((game) => (
              <li
                key={game.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {t('game', { number: game.number })} ·{' '}
                    {game.winner ? t('winner', { name: game.winner.name }) : t('draw')}
                  </p>
                  <DeleteButton path={`/api/v1/games/${game.id}`} />
                </div>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {game.players.map((p) => (
                    <li key={p.userId}>
                      <span className={p.result === 'win' ? 'font-semibold' : ''}>{p.name}</span>{' '}
                      <span className="muted">
                        · {t(`result.${p.result}`)}
                        {p.deckName && ` · ${p.deckName}`}
                      </span>
                    </li>
                  ))}
                </ul>
                {game.notes && <p className="muted mt-2">{game.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">{t('recordGame')}</h2>
        <RecordGameForm eventId={event.id} players={players} />
      </section>
    </>
  );
}
