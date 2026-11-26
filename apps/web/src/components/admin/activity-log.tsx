import {
  ACTIVITY_KINDS,
  ACTIVITY_PERIODS,
  activitySince,
  isActivityKind,
  type ActivityKind,
  type ActivityPeriod,
} from '@boramarcar/core';
import { listActivity } from '@boramarcar/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icons';
import { getDb } from '@/server/db';

export interface ActivityFilters {
  q?: string;
  tipo?: string;
  grupo?: string;
  periodo?: string;
  pagina?: string;
}

const PAGE_SIZE = 50;

/**
 * Aba "Atividade" do Admin: o registro de ações (agrupado por pessoa × ação × alvo × hora), com
 * filtros num formulário GET (sem JavaScript; os filtros ficam no endereço) e páginas de 50.
 */
export async function ActivityLog({
  filters,
  groups,
}: {
  filters: ActivityFilters;
  groups: { id: string; name: string }[];
}) {
  const t = await getTranslations('admin.activity');
  const format = await getFormatter();
  const period: ActivityPeriod = (ACTIVITY_PERIODS as readonly string[]).includes(
    filters.periodo ?? '',
  )
    ? (filters.periodo as ActivityPeriod)
    : '7d';
  const kind = filters.tipo && isActivityKind(filters.tipo) ? filters.tipo : undefined;
  const groupId = groups.some((g) => g.id === filters.grupo) ? filters.grupo : undefined;
  const q = filters.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.min(100, Number(filters.pagina) || 1));
  const { items, hasMore } = await listActivity(getDb(), {
    since: activitySince(new Date(), period),
    kind,
    groupId,
    query: q,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const phrase = (item: (typeof items)[number]) =>
    t(`phrases.${item.kind as ActivityKind}`, {
      count: item.count,
      label: item.label ?? t('unnamed'),
    });
  const pageHref = (n: number) => {
    const params = new URLSearchParams({ aba: 'atividade', periodo: period });
    if (q) params.set('q', q);
    if (kind) params.set('tipo', kind);
    if (groupId) params.set('grupo', groupId);
    if (n > 1) params.set('pagina', String(n));
    return `/admin?${params.toString()}`;
  };

  return (
    <section className="card space-y-4" aria-labelledby="admin-atividade">
      <div>
        <h2 id="admin-atividade" className="section-title mb-1">
          {t('title')}
        </h2>
        <p className="muted max-w-2xl">{t('intro')}</p>
      </div>

      <form method="get" action="/admin" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="aba" value="atividade" />
        <div className="lg:col-span-2">
          <label className="label" htmlFor="atividade-q">
            {t('person')}
          </label>
          <input
            id="atividade-q"
            name="q"
            className="input"
            defaultValue={q ?? ''}
            maxLength={100}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="atividade-tipo">
            {t('kind')}
          </label>
          <select id="atividade-tipo" name="tipo" className="select" defaultValue={kind ?? ''}>
            <option value="">{t('allKinds')}</option>
            {ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="atividade-grupo">
            {t('group')}
          </label>
          <select id="atividade-grupo" name="grupo" className="select" defaultValue={groupId ?? ''}>
            <option value="">{t('allGroups')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="atividade-periodo">
            {t('period')}
          </label>
          <select id="atividade-periodo" name="periodo" className="select" defaultValue={period}>
            {ACTIVITY_PERIODS.map((p) => (
              <option key={p} value={p}>
                {t(`periods.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <button className="btn-primary">
            <Icon name="filter" />
            {t('apply')}
          </button>
          <Link href="/admin?aba=atividade" className="btn-secondary">
            {t('clear')}
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ul className="divide-y divide-line" aria-label={t('listLabel')}>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5"
            >
              <p className="min-w-0">
                <span className="font-semibold">{item.userName}</span> {phrase(item)}
                <span className="muted block text-sm" data-cs-mask>
                  {item.userEmail}
                  {item.groupName ? ` · ${item.groupName}` : ''}
                </span>
              </p>
              <time className="muted text-sm tabular-nums" dateTime={item.lastAt.toISOString()}>
                {format.dateTime(item.lastAt, { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || hasMore) && (
        <nav className="flex flex-wrap gap-2" aria-label={t('pagesLabel')}>
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              <Icon name="previous" />
              {t('newer')}
            </Link>
          )}
          {hasMore && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              {t('older')}
              <Icon name="next" />
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
