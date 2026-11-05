import { buildWeekGrid, DEFAULT_MIN_PLAYERS, weekStartFor } from '@boramarcar/core/availability';
import { zonedLocalToUtc } from '@boramarcar/core/time';
import {
  listAvailability,
  listAvailabilityRules,
  listLocations,
  listMembers,
  suggestGameWindows,
} from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getLocale, getTimeZone, getTranslations } from 'next-intl/server';
import {
  ApiActionButton,
  AvailabilityForm,
  CreateEventFromWindowButton,
  DeleteButton,
} from '@/components/availability-forms';
import { AvailabilityGrid } from '@/components/availability-grid';
import { weekdayNames } from '@/lib/weekdays';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';
import { Icon } from '@/components/icons';

export const generateMetadata = navMetadata('availability');

const DAY = 24 * 60 * 60 * 1000;
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

type Props = { searchParams: Promise<{ semana?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const timeZone = await getTimeZone();
  const locale = await getLocale();
  const { semana } = await searchParams;

  const currentWeek = weekStartFor(new Date(), timeZone);
  const weekStart =
    semana && /^\d{4}-\d{2}-\d{2}$/.test(semana)
      ? weekStartFor(zonedLocalToUtc(`${semana}T12:00`, timeZone), timeZone)
      : currentWeek;
  const weekFrom = zonedLocalToUtc(`${weekStart}T00:00`, timeZone);
  const weekTo = zonedLocalToUtc(`${addDays(weekStart, 7)}T00:00`, timeZone);

  const from = new Date();
  const to = new Date(from.getTime() + 30 * DAY);
  const [slots, weekSlots, locations, windows, rules, members] = await Promise.all([
    listAvailability(db, { groupId: group.id, userId: user.id, from, to }),
    listAvailability(db, { groupId: group.id, userId: user.id, from: weekFrom, to: weekTo }),
    listLocations(db, group.id),
    suggestGameWindows(db, { groupId: group.id, userId: user.id, from, to }),
    listAvailabilityRules(db, { groupId: group.id, userId: user.id }),
    listMembers(db, group.id),
  ]);
  const grid = buildWeekGrid({
    weekStart,
    timeZone,
    currentUserId: user.id,
    slots: weekSlots.map((s) => ({
      userId: s.userId,
      start: s.startsAt,
      end: s.endsAt,
      kind: s.kind,
    })),
  });

  const t = await getTranslations('availability');
  const tc = await getTranslations('common');
  const te = await getTranslations('events');
  const format = await getFormatter();
  const days = weekdayNames(locale);
  const locationName = new Map(locations.map((l) => [l.id, l.name]));
  const range = (start: Date, end: Date) =>
    format.dateTimeRange(start, end, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const localDate = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
  const myRules = rules.filter((r) => r.userId === user.id);
  const ruleSummary = (r: (typeof rules)[number]) =>
    t('ruleSummary', { weekday: days[r.weekday]!, start: r.startTime, end: r.endTime });
  const weekLink = (date: string) =>
    date === currentWeek ? '/disponibilidade' : `/disponibilidade?semana=${date}`;

  return (
    <>
      <h1 className="page-title">{t('title')}</h1>

      <section className="card" aria-labelledby="windows-title">
        <h2 id="windows-title" className="section-title">
          {t('windows')}
        </h2>
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

      <section className="card space-y-3" aria-labelledby="grid-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="grid-title" className="section-title mb-0">
            {t('gridTitle')}
          </h2>
          <nav aria-label={t('gridTitle')} className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={weekLink(addDays(weekStart, -7))}>
              <Icon name="previous" />
              {t('previousWeek')}
            </Link>
            {weekStart !== currentWeek && (
              <Link className="btn-secondary" href="/disponibilidade">
                {t('thisWeek')}
              </Link>
            )}
            <Link className="btn-secondary" href={weekLink(addDays(weekStart, 7))}>
              {t('nextWeek')}
              <Icon name="next" />
            </Link>
          </nav>
        </div>
        <AvailabilityGrid
          groupId={group.id}
          grid={grid}
          members={members.map((m) => ({ userId: m.userId, name: m.name }))}
          minPlayers={DEFAULT_MIN_PLAYERS}
        />
      </section>

      <section className="card" aria-labelledby="add-title">
        <h2 id="add-title" className="section-title">
          {t('add')}
        </h2>
        <AvailabilityForm
          groupId={group.id}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </section>

      <section className="card" aria-labelledby="rules-title">
        <h2 id="rules-title" className="section-title">
          {t('myRules')}
        </h2>
        {myRules.length === 0 ? (
          <p className="muted">{t('noRules')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {myRules.map((rule) => (
              <li key={rule.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium first-letter:uppercase">{ruleSummary(rule)}</p>
                    <p className="muted">
                      {rule.locationIds.length
                        ? rule.locationIds.map((id) => locationName.get(id) ?? id).join(', ')
                        : tc('anyLocation')}
                      {rule.note && ` · ${rule.note}`}
                    </p>
                  </div>
                  <DeleteButton
                    path={`/api/v1/availability-rules/${rule.id}`}
                    context={t('removeRule', { summary: ruleSummary(rule) })}
                  />
                </div>
                {rule.exceptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="muted">{t('skippedDates')}</span>
                    {rule.exceptions.map((date) => (
                      <span
                        key={date}
                        className="flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pr-1 pl-3 dark:bg-zinc-800"
                      >
                        {localDate(date)}
                        <ApiActionButton
                          path={`/api/v1/availability-rules/${rule.id}/exceptions`}
                          method="PUT"
                          body={{ date, skip: false }}
                          label={t('unskipLabel', { date: localDate(date) })}
                          className="btn min-h-8 px-2 text-brand-700 underline dark:text-brand-100"
                        >
                          <Icon name="undo" className="size-3.5" />
                          {t('unskip')}
                        </ApiActionButton>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="everyone-title">
        <h2 id="everyone-title" className="section-title">
          {t('everyone')}
        </h2>
        {slots.length === 0 ? (
          <p className="muted">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {slots.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {slot.userName} · {range(slot.startsAt, slot.endsAt)}
                    {slot.kind === 'weekly' && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal dark:bg-zinc-800">
                        ↻ {t('weeklyTag')}
                      </span>
                    )}
                  </p>
                  <p className="muted">
                    {slot.locationIds.length
                      ? slot.locationIds.map((id) => locationName.get(id) ?? id).join(', ')
                      : tc('anyLocation')}
                    {slot.note && ` · ${slot.note}`}
                  </p>
                </div>
                {slot.userId === user.id &&
                  (slot.kind === 'weekly' && slot.ruleId && slot.date ? (
                    <ApiActionButton
                      path={`/api/v1/availability-rules/${slot.ruleId}/exceptions`}
                      method="PUT"
                      body={{ date: slot.date, skip: true }}
                      label={`${t('skipDate')}: ${t('skipDateLabel', { date: localDate(slot.date) })}`}
                    >
                      <Icon name="skipDate" />
                      {t('skipDate')}
                    </ApiActionButton>
                  ) : (
                    <DeleteButton
                      path={`/api/v1/availability/${slot.id}`}
                      context={t('removeSlot', { when: range(slot.startsAt, slot.endsAt) })}
                    />
                  ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
