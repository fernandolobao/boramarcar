import { listAvailability, listLocations, suggestGameWindows } from '@boramarcar/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import {
  AvailabilityForm,
  CreateEventFromWindowButton,
  DeleteButton,
} from '@/components/availability-forms';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('availability');

const DAY = 24 * 60 * 60 * 1000;

export default async function AvailabilityPage() {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const from = new Date();
  const to = new Date(from.getTime() + 30 * DAY);
  const [slots, locations, windows] = await Promise.all([
    listAvailability(db, { groupId: group.id, userId: user.id, from, to }),
    listLocations(db, group.id),
    suggestGameWindows(db, { groupId: group.id, userId: user.id, from, to }),
  ]);
  const t = await getTranslations('availability');
  const tc = await getTranslations('common');
  const te = await getTranslations('events');
  const format = await getFormatter();
  const locationName = new Map(locations.map((l) => [l.id, l.name]));
  const range = (start: Date, end: Date) =>
    format.dateTimeRange(start, end, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <h1 className="page-title">{t('title')}</h1>

      <section className="card">
        <h2 className="section-title">{t('windows')}</h2>
        {windows.length === 0 ? (
          <p className="muted">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {windows.map((w) => (
              <li
                key={`${w.start.toISOString()}-${w.locationId}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{range(w.start, w.end)}</p>
                  <p className="muted">
                    {w.locationName ?? tc('locationTbd')} ·{' '}
                    {w.players.map((p) => p.name).join(', ')}
                  </p>
                </div>
                <CreateEventFromWindowButton
                  groupId={group.id}
                  title={te('defaultTitle')}
                  startsAt={w.start.toISOString()}
                  endsAt={w.end.toISOString()}
                  locationId={w.locationId}
                  participantIds={w.userIds}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">{t('add')}</h2>
        <AvailabilityForm
          groupId={group.id}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </section>

      <section className="card">
        <h2 className="section-title">{t('everyone')}</h2>
        {slots.length === 0 ? (
          <p className="muted">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {slots.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {slot.userName} · {range(slot.startsAt, slot.endsAt)}
                  </p>
                  <p className="muted">
                    {slot.locationIds.length
                      ? slot.locationIds.map((id) => locationName.get(id) ?? id).join(', ')
                      : tc('anyLocation')}
                    {slot.note && ` · ${slot.note}`}
                  </p>
                </div>
                {slot.userId === user.id && (
                  <DeleteButton
                    path={`/api/v1/availability/${slot.id}`}
                    label={t('removeSlot', { when: range(slot.startsAt, slot.endsAt) })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
