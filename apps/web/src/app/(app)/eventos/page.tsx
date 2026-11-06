import { listEvents, listLocations } from '@boramarcar/db';
import { Icon } from '@/components/icons';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { NewEventForm } from '@/components/event-forms';
import { EventStatusBadge } from '@/components/event-manage';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('events');

export default async function EventsPage() {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const now = new Date();
  const [upcoming, past, locations] = await Promise.all([
    listEvents(db, { groupId: group.id, userId: user.id, when: 'upcoming', now }),
    listEvents(db, { groupId: group.id, userId: user.id, when: 'past', now }),
    listLocations(db, group.id),
  ]);
  const t = await getTranslations('events');
  const th = await getTranslations('history');
  const tc = await getTranslations('common');
  const format = await getFormatter();

  const list = (events: typeof upcoming) =>
    events.length === 0 ? (
      <p className="muted">{t('empty')}</p>
    ) : (
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/eventos/${event.id}`} className="block py-3 hover:opacity-80">
              <p className="flex items-center gap-2 font-medium">
                {event.title}{' '}
                {event.status !== 'scheduled' && <EventStatusBadge status={event.status} />}
              </p>
              <p className="muted">
                {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
                {event.locationName ?? tc('locationTbd')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <h1 className="page-title">{t('title')}</h1>
      <section className="card">
        <h2 className="section-title">{t('new')}</h2>
        <NewEventForm
          groupId={group.id}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </section>
      <section className="card">
        <h2 className="section-title">{t('upcoming')}</h2>
        {list(upcoming)}
      </section>
      <section className="card">
        <h2 className="section-title">{t('past')}</h2>
        {list(past.slice(0, 5))}
        <p className="mt-3">
          <Link href="/eventos/historico" className="inline-flex items-center gap-1 underline">
            {th('seeAll')}
            <Icon name="next" />
          </Link>
        </p>
      </section>
    </>
  );
}
