import type { Metadata } from 'next';
import { listMembers, searchEventHistory } from '@boramarcar/db';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { EventStatusBadge } from '@/components/event-manage';
import { Icon } from '@/components/icons';
import { getDb } from '@/server/db';
import { requireUserAndGroup } from '@/server/require-group';

const STATUSES = ['finished', 'scheduled', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

type Props = {
  searchParams: Promise<{ q?: string; situacao?: string; jogador?: string; pagina?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('history'))('title') };
}

/** Histórico de encontros (2.10): busca por texto, situação e jogador, com paginação. */
export default async function EventHistoryPage({ searchParams }: Props) {
  const { user, group } = await requireUserAndGroup();
  const params = await searchParams;
  const db = getDb();
  const q = (params.q ?? '').slice(0, 100);
  const status = (STATUSES as readonly string[]).includes(params.situacao ?? '')
    ? (params.situacao as Status)
    : undefined;
  const members = await listMembers(db, group.id);
  const playerId = members.some((m) => m.userId === params.jogador) ? params.jogador : undefined;
  const page = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);
  const result = await searchEventHistory(db, {
    groupId: group.id,
    userId: user.id,
    q,
    status,
    playerId,
    page,
  });
  const t = await getTranslations('history');
  const te = await getTranslations('events');
  const tc = await getTranslations('common');
  const format = await getFormatter();
  const filtered = Boolean(q || status || playerId);

  const pageHref = (n: number) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (status) search.set('situacao', status);
    if (playerId) search.set('jogador', playerId);
    if (n > 1) search.set('pagina', String(n));
    const query = search.toString();
    return `/eventos/historico${query ? `?${query}` : ''}`;
  };

  return (
    <>
      <p>
        <Link href="/eventos" className="inline-flex items-center gap-1 text-sm underline">
          <Icon name="previous" />
          {te('title')}
        </Link>
      </p>
      <h1 className="page-title">{t('title')}</h1>

      <form
        method="get"
        role="search"
        aria-label={t('filters')}
        className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
      >
        <div>
          <label className="label" htmlFor="historico-q">
            {t('search')}
          </label>
          <input
            id="historico-q"
            name="q"
            type="search"
            className="input"
            defaultValue={q}
            maxLength={100}
            aria-describedby="historico-q-dica"
          />
          <p id="historico-q-dica" className="muted mt-1 text-xs">
            {t('searchHint')}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="historico-situacao">
            {t('status')}
          </label>
          <select
            id="historico-situacao"
            name="situacao"
            className="select"
            defaultValue={status ?? ''}
          >
            <option value="">{t('allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {te(`status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="historico-jogador">
            {t('player')}
          </label>
          <select
            id="historico-jogador"
            name="jogador"
            className="select"
            defaultValue={playerId ?? ''}
          >
            <option value="">{t('allPlayers')}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
          <button className="btn-primary">
            <Icon name="filter" />
            {t('apply')}
          </button>
          {filtered && (
            <Link href="/eventos/historico" className="btn-secondary">
              <Icon name="close" />
              {t('clear')}
            </Link>
          )}
        </div>
      </form>

      <section className="card" aria-labelledby="historico-resultados">
        <h2 id="historico-resultados" className="section-title">
          {t('results', { count: result.total })}
        </h2>
        {result.items.length === 0 ? (
          <p className="muted">{filtered ? t('noResults') : t('empty')}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {result.items.map((event) => (
              <li key={event.id}>
                <Link href={`/eventos/${event.id}`} className="block py-3 hover:opacity-80">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {event.title}
                    {event.status !== 'scheduled' && <EventStatusBadge status={event.status} />}
                  </span>
                  <span className="muted block">
                    {format.dateTime(event.startsAt, { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
                    {event.locationName ?? tc('locationTbd')}
                  </span>
                  <span className="block text-sm">
                    {t('summary', { games: event.games, attendees: event.attendees })}
                    {event.winners.length > 0 &&
                      ` · ${t('winners', { names: format.list(event.winners, { type: 'conjunction' }), count: event.winners.length })}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {result.pages > 1 && (
          <nav aria-label={t('pagination')} className="mt-4 flex flex-wrap items-center gap-3">
            {result.page > 1 && (
              <Link href={pageHref(result.page - 1)} className="btn-secondary" rel="prev">
                <Icon name="previous" />
                {t('previous')}
              </Link>
            )}
            <span className="text-sm" aria-current="page">
              {t('pageOf', { page: result.page, pages: result.pages })}
            </span>
            {result.page < result.pages && (
              <Link href={pageHref(result.page + 1)} className="btn-secondary" rel="next">
                {t('next')}
                <Icon name="next" />
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
