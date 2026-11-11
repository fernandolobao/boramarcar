import {
  getEventDetail,
  getGroupRanking,
  getGroupStats,
  listEvents,
  suggestGameWindows,
} from '@boramarcar/db';
import Image from 'next/image';
import Link from 'next/link';
import { StackSections } from '@/components/stack-sections';
import { getFormatter, getTimeZone, getTranslations } from 'next-intl/server';
import { CreateEventFromWindowButton } from '@/components/availability-forms';
import { CardNames } from '@/components/card-dialog';
import { Icon } from '@/components/icons';
import { PlayerLink, PlayerLinks } from '@/components/player-link';
import { getDb } from '@/server/db';
import { navMetadata } from '@/server/metadata';
import { requireUserAndGroup } from '@/server/require-group';

export const generateMetadata = navMetadata('dashboard');

const DAY = 24 * 60 * 60 * 1000;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

/** Bolinhas com as iniciais (decorativas: os nomes estão em texto ao lado). */
function Avatars({ people, max = 6 }: { people: readonly { name: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <span className="flex -space-x-2" aria-hidden="true">
      {shown.map((p, i) => (
        <span
          key={`${p.name}-${i}`}
          className="inline-flex size-9 items-center justify-center rounded-full bg-pergaminho text-xs font-bold text-arcano ring-2 ring-arcano"
        >
          {initials(p.name)}
        </span>
      ))}
      {people.length > max && (
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-eter text-xs font-bold text-white ring-2 ring-arcano">
          +{people.length - max}
        </span>
      )}
    </span>
  );
}

/** Anel de aproveitamento (decorativo: o valor está em texto ao lado). */
function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 64 64"
      className="hidden size-16 shrink-0 -rotate-90 sm:block"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" className="stroke-surface-muted" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0, Math.min(1, value)) * c} ${c}`}
        className="stroke-primary"
      />
    </svg>
  );
}

function Tile({
  icon,
  label,
  value,
  detail,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="card flex items-center gap-4 p-3 sm:p-4">
      {children ?? (
        <span
          className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 sm:inline-flex dark:bg-brand-900 dark:text-brand-300"
          aria-hidden="true"
        >
          <Icon name={icon} className="size-6" />
        </span>
      )}
      <div className="min-w-0">
        <p className="muted">{label}</p>
        <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</p>
        {detail && <p className="muted">{detail}</p>}
      </div>
    </li>
  );
}

/**
 * Painel: o próximo encontro em destaque, os seus números (posição, pontos, aproveitamento,
 * sequência e forma recente), o pódio, a atividade do grupo, os melhores horários e os
 * comandantes em alta. Nomes de jogadores levam ao perfil; nomes de cartas abrem a carta.
 */
export default async function DashboardPage() {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const now = new Date();
  const timeZone = await getTimeZone();
  const [events, windows, ranking, stats] = await Promise.all([
    listEvents(db, {
      groupId: group.id,
      userId: user.id,
      when: 'upcoming',
      now,
      includeCancelled: false,
    }),
    suggestGameWindows(db, {
      groupId: group.id,
      userId: user.id,
      from: now,
      to: new Date(now.getTime() + 21 * DAY),
    }),
    getGroupRanking(db, { groupId: group.id, userId: user.id }),
    getGroupStats(db, { groupId: group.id, userId: user.id, now, timeZone }),
  ]);
  const next = events[0]
    ? await getEventDetail(db, { eventId: events[0].id, userId: user.id }).catch(() => null)
    : null;
  const t = await getTranslations('dashboard');
  const tc = await getTranslations('common');
  const te = await getTranslations('events');
  const format = await getFormatter();
  const percent = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 0 });

  const me = ranking.standings.find((s) => s.userId === user.id) ?? null;
  const mine = stats.players.find((p) => p.userId === user.id) ?? null;
  const confirmed = next?.participants.filter((p) => p.rsvp === 'yes') ?? [];
  const maybe = next?.participants.filter((p) => p.rsvp === 'maybe') ?? [];
  const myRsvp = next?.participants.find((p) => p.userId === user.id)?.rsvp ?? null;
  const podium = ranking.standings.slice(0, 3);
  const maxMonth = Math.max(1, ...stats.activity.map((m) => m.games));
  const monthLabel = (month: string) =>
    format.dateTime(new Date(`${month}-15T12:00:00Z`), { month: 'short', timeZone: 'UTC' });
  const recent = mine?.recent ?? [];
  const count = (r: string) => recent.filter((x) => x === r).length;

  return (
    <>
      {/* Destaque: saudação e o próximo encontro. */}
      <section
        aria-labelledby="painel-titulo"
        className="relative isolate overflow-hidden rounded-3xl bg-arcano p-6 text-pergaminho sm:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-24 -z-10 opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side at 85% 15%, var(--color-eter), transparent), radial-gradient(closest-side at 10% 100%, var(--color-teal-800), transparent)',
          }}
        />
        <p className="text-sm font-medium text-gold-300">{group.name}</p>
        <h1 id="painel-titulo" className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('hello', { name: user.name.split(' ')[0] ?? user.name })}
        </h1>
        {next ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-2">
              <p className="text-sm font-semibold tracking-wide text-gold-300 uppercase">
                {t('nextEvent')} · {format.relativeTime(next.startsAt, now)}
              </p>
              <h2 className="text-2xl font-bold">
                <Link href={`/eventos/${next.id}`} className="underline-offset-4 hover:underline">
                  {next.title}
                </Link>
              </h2>
              <p className="text-ink-200">
                {format.dateTime(next.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
                {next.location?.name ?? tc('locationTbd')}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Avatars people={confirmed} />
                <p className="text-sm text-ink-200">
                  {t('confirmed', { count: confirmed.length })}
                  {maybe.length > 0 && ` · ${t('maybe', { count: maybe.length })}`}
                  {confirmed.length > 0 && (
                    <span className="sr-only">: {confirmed.map((p) => p.name).join(', ')}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/eventos/${next.id}`}
                className="btn bg-accent px-5 text-base text-on-accent hover:bg-gold-300"
              >
                <Icon name="events" />
                {myRsvp ? t('openEvent') : t('answerRsvp')}
              </Link>
              {myRsvp && (
                <span className="inline-flex min-h-10 items-center rounded-xl bg-white/10 px-4 text-sm ring-1 ring-white/25">
                  {t('yourRsvp', { rsvp: te(`rsvp.${myRsvp}`) })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-lg text-ink-200">{t('noEvents')}</p>
            <Link
              href="/disponibilidade"
              className="btn bg-accent px-5 text-base text-on-accent hover:bg-gold-300"
            >
              <Icon name="availability" />
              {t('seeAvailability')}
            </Link>
          </div>
        )}
      </section>

      {/* Os seus números. */}
      <section aria-labelledby="painel-numeros" className="space-y-3">
        <h2 id="painel-numeros" className="section-title mb-0">
          {t('yourNumbers')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Tile
            icon="ranking"
            label={t('position')}
            value={me ? `${me.position}º` : '—'}
            detail={me ? t('ofPlayers', { count: ranking.standings.length }) : t('noGamesYet')}
          />
          <Tile
            icon="winner"
            label={t('points')}
            value={me ? String(me.points) : '—'}
            detail={
              me ? t('record', { wins: me.wins, losses: me.losses, draws: me.draws }) : undefined
            }
          />
          <Tile
            icon="games"
            label={t('winRate')}
            value={me && me.games ? percent(me.winRate) : '—'}
            detail={me ? t('winsOf', { wins: me.wins, games: me.games }) : undefined}
          >
            <Ring value={me?.winRate ?? 0} />
          </Tile>
          <Tile
            icon="streak"
            label={t('streak')}
            value={String(mine?.currentStreak ?? 0)}
            detail={t('bestStreak', { count: mine?.bestStreak ?? 0 })}
          />
        </ul>
        {recent.length > 0 && (
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <h3 className="font-semibold">{t('form')}</h3>
            <ol className="flex flex-wrap gap-1.5" aria-label={t('formLabel')}>
              {recent.map((r, i) => (
                <li
                  key={i}
                  className={`inline-flex size-8 items-center justify-center rounded-lg text-sm font-bold ${
                    r === 'win'
                      ? 'bg-primary text-on-primary'
                      : r === 'draw'
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface-muted text-fg'
                  }`}
                >
                  <span aria-hidden="true">{t(`formShort.${r}`)}</span>
                  <span className="sr-only">{t(`formLong.${r}`)}</span>
                </li>
              ))}
            </ol>
            <p className="muted">
              {t('formSummary', {
                wins: count('win'),
                losses: count('loss'),
                draws: count('draw'),
              })}
            </p>
          </div>
        )}
      </section>

      {/* Seções em pilha de cartas: cada uma desliza por cima da anterior ao rolar. */}
      <StackSections>
        {/* Pódio. */}
        <section className="card" aria-labelledby="painel-podio">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="painel-podio" className="section-title mb-0">
              {t('podium')}
            </h2>
            <Link
              href="/ranking"
              className="text-sm font-medium text-link underline-offset-2 hover:underline"
            >
              {t('fullRanking')}
            </Link>
          </div>
          {podium.length === 0 ? (
            <p className="muted">{t('noRanking')}</p>
          ) : (
            <ol className="grid grid-cols-3 items-end gap-2 text-center">
              {[podium[1], podium[0], podium[2]].map((s, i) => {
                if (!s) return <li key={`empty-${i}`} aria-hidden="true" />;
                const place = s.position;
                const style =
                  place === 1
                    ? 'h-32 bg-accent text-on-accent'
                    : place === 2
                      ? 'h-24 bg-ink-300 text-noite dark:bg-ink-700 dark:text-ink-100'
                      : 'h-20 bg-gold-600 text-noite';
                return (
                  <li
                    key={s.userId}
                    className="flex flex-col items-center gap-2"
                    style={{ order: i }}
                  >
                    <span className="text-sm font-semibold">
                      <PlayerLink userId={s.userId} name={s.name} />
                    </span>
                    <span className="muted text-xs">{t('pointsShort', { count: s.points })}</span>
                    <span
                      className={`flex w-full items-start justify-center rounded-t-xl pt-2 text-2xl font-extrabold ${style}`}
                    >
                      {place}º
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Atividade do grupo. */}
        <section className="card" aria-labelledby="painel-atividade">
          <h2 id="painel-atividade" className="section-title">
            {t('activity')}
          </h2>
          {/* Barras decorativas; os mesmos números estão na tabela para leitores de tela. */}
          <div className="flex h-36 items-end gap-2" aria-hidden="true">
            {stats.activity.map((m) => (
              <div
                key={m.month}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${monthLabel(m.month)}: ${t('gamesCount', { count: m.games })}`}
              >
                <span className="text-xs font-semibold tabular-nums">{m.games}</span>
                <span
                  className="w-full max-w-10 rounded-t bg-primary"
                  style={{ height: `${(m.games / maxMonth) * 100}%`, minHeight: m.games ? 4 : 0 }}
                />
                <span className="muted text-xs capitalize">{monthLabel(m.month)}</span>
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>{t('activityCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('month')}</th>
                <th scope="col">{t('games')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.activity.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{monthLabel(m.month)}</th>
                  <td>{m.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-muted p-2">
              <dt className="muted text-xs">{t('totalGames')}</dt>
              <dd className="text-xl font-bold tabular-nums">{stats.totalGames}</dd>
            </div>
            <div className="rounded-xl bg-surface-muted p-2">
              <dt className="muted text-xs">{t('avgTurn')}</dt>
              <dd className="text-xl font-bold tabular-nums">
                {stats.averageWinningTurn != null
                  ? format.number(stats.averageWinningTurn, { maximumFractionDigits: 1 })
                  : '—'}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-muted p-2">
              <dt className="muted text-xs">{t('avgDuration')}</dt>
              <dd className="text-xl font-bold tabular-nums">
                {stats.averageDurationMinutes != null
                  ? tc('minutes', { count: Math.round(stats.averageDurationMinutes) })
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Melhores horários. */}
        <section className="card" aria-labelledby="painel-horarios">
          <h2 id="painel-horarios" className="section-title">
            {t('bestWindows')}
          </h2>
          {windows.length === 0 ? (
            <p className="muted">{t('noWindows')}</p>
          ) : (
            <ul className="space-y-4">
              {windows.slice(0, 3).map((w) => (
                <li
                  key={`${w.start.toISOString()}-${w.locationId}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-s-4 border-accent ps-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {format.dateTimeRange(w.start, w.end, {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="muted">
                      {w.locationName ?? tc('locationTbd')} · <PlayerLinks players={w.players} />
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
          <Link href="/disponibilidade" className="btn-secondary mt-4">
            <Icon name="availability" />
            {t('seeAvailability')}
          </Link>
        </section>

        {/* Comandantes em alta. */}
        <section className="card" aria-labelledby="painel-comandantes">
          <h2 id="painel-comandantes" className="section-title">
            {t('hotCommanders')}
          </h2>
          {stats.commanders.length === 0 ? (
            <p className="muted">{t('noCommanders')}</p>
          ) : (
            <ol className="space-y-3">
              {stats.commanders.slice(0, 4).map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    {c.artUri && (
                      <Image
                        src={c.artUri}
                        alt=""
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <CardNames names={c.name.split(' & ')} separator=" & " />
                    </p>
                    <p className="muted">
                      {t('commanderStats', { games: c.games, rate: percent(c.winRate) })} ·{' '}
                      <PlayerLinks players={c.players} />
                    </p>
                    <span
                      className="mt-1 block h-1.5 rounded-full bg-surface-muted"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-1.5 rounded-full bg-mana"
                        style={{ width: `${Math.round(c.winRate * 100)}%` }}
                      />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        {events.length > 1 && (
          <section className="card" aria-labelledby="painel-encontros">
            <h2 id="painel-encontros" className="section-title">
              {t('moreEvents')}
            </h2>
            <ul className="divide-y divide-line">
              {events.slice(1, 6).map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/eventos/${event.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl p-2 hover:bg-surface-muted"
                  >
                    <span className="font-medium">{event.title}</span>
                    <span className="muted">
                      {format.dateTime(event.startsAt, { dateStyle: 'medium', timeStyle: 'short' })}{' '}
                      · {event.locationName ?? tc('locationTbd')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </StackSections>
    </>
  );
}
