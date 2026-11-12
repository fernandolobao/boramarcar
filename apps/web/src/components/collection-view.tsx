'use client';

import {
  COLLECTION_CMCS,
  COLLECTION_COLORS,
  COLLECTION_RARITIES,
  COLLECTION_SORTS,
  COLLECTION_TYPES,
  collectionFacets,
  collectionTotals,
  filterCollection,
  releaseYear,
  sortCollection,
  unitPriceUsd,
  type CardData,
  type CollectionColor,
  type CollectionFilters,
  type CollectionSort,
  type CollectionType,
} from '@boramarcar/core';
import Image from 'next/image';
import { HoloLayers } from './holo-effects';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { CardDialog } from './card-dialog';
import { CardSearch } from './card-search';
import { Icon } from './icons';
import { ManaSymbol, useColorName } from './mana';
import { printLabel, PrintPicker } from './print-picker';
import { FormError, useApiAction } from './use-api-action';

export interface CollectionViewEntry {
  id: string;
  name: string;
  scryfallId: string | null;
  quantity: number;
  foil: boolean;
  card: CardData | null;
  addedAt: string;
  decks: { deckId: string; deckName: string; quantity: number; proxies: number }[];
}

/** Quantas linhas aparecem de cada vez (muitas imagens de uma vez pesam no celular). */
const PAGE = 120;

const EMPTY: CollectionFilters = { colorMode: 'any', foil: 'all', inDeck: 'all' };

function activeCount(f: CollectionFilters) {
  return [
    f.text?.trim(),
    f.colors?.length,
    f.cmcs?.length,
    f.types?.length,
    f.set,
    f.year,
    f.artist?.trim(),
    f.rarity,
    f.foil !== 'all',
    f.inDeck !== 'all',
  ].filter(Boolean).length;
}

const toggle = <T,>(list: readonly T[] | undefined, value: T) =>
  list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

/**
 * Coleção pessoal: totais e valor, adicionar cartas, filtros (cor, custo, tipo, edição, ano,
 * ilustrador, raridade, foil, em deck), ordem e duas visualizações densas (galeria e lista).
 * Filtra no navegador: a coleção vem inteira do servidor.
 */
export function CollectionView({
  entries,
  brlRate,
  rateDate,
}: {
  entries: CollectionViewEntry[];
  /** Cotação USD→BRL; sem ela, só dólar. */
  brlRate: number | null;
  rateDate: string | null;
}) {
  const t = useTranslations('collection');
  const format = useFormatter();
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY);
  const [sort, setSort] = useState<CollectionSort>('name');
  const [view, setView] = useState<'gallery' | 'list'>('gallery');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const usd = (v: number) => format.number(v, { style: 'currency', currency: 'USD' });
  const brl = (v: number) => format.number(v, { style: 'currency', currency: 'BRL' });
  const money = (v: number) => (brlRate ? `${brl(v * brlRate)} (${usd(v)})` : usd(v));

  const totals = useMemo(() => collectionTotals(entries), [entries]);
  const facets = useMemo(() => collectionFacets(entries), [entries]);
  const visible = useMemo(
    () => sortCollection(filterCollection(entries, filters), sort),
    [entries, filters, sort],
  );
  const shownTotals = useMemo(() => collectionTotals(visible), [visible]);
  const page = visible.slice(0, limit);
  const current = openId ? (entries.find((e) => e.id === openId) ?? null) : null;

  const update = (patch: Partial<CollectionFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };
  const open = (entry: CollectionViewEntry, el: HTMLElement) => {
    opener.current = el;
    setOpenId(entry.id);
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="colecao-totais" className="grid gap-3 sm:grid-cols-3">
        <h2 id="colecao-totais" className="sr-only">
          {t('value')}
        </h2>
        <div className="card">
          <p className="text-2xl font-bold tabular-nums">{t('copies', { count: totals.copies })}</p>
          <p className="muted text-sm">{t('unique', { count: totals.unique })}</p>
        </div>
        <div className="card sm:col-span-2">
          <p className="muted text-sm">{t('value')}</p>
          <p className="text-2xl font-bold tabular-nums" data-testid="collection-value">
            {brlRate ? brl(totals.valueUsd * brlRate) : usd(totals.valueUsd)}
            {brlRate && (
              <span className="muted ms-2 text-base font-medium">{usd(totals.valueUsd)}</span>
            )}
          </p>
          <p className="muted text-xs">
            {t('valueHint', {
              brl: brlRate ? 'yes' : 'none',
              date: rateDate
                ? format.dateTime(new Date(`${rateDate}T12:00:00Z`), { dateStyle: 'short' })
                : '',
            })}
            {totals.unpriced > 0 && ` ${t('unpriced', { count: totals.unpriced })}`}
          </p>
        </div>
      </section>

      <AddToCollection empty={entries.length === 0} />

      {entries.length === 0 ? (
        <p className="muted">{t('empty')}</p>
      ) : (
        <>
          <Filters
            filters={filters}
            update={update}
            reset={() => {
              setFilters(EMPTY);
              setLimit(PAGE);
            }}
            facets={facets}
          />

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full sm:w-72">
              <label className="label" htmlFor="colecao-busca">
                {t('search')}
              </label>
              <input
                id="colecao-busca"
                type="search"
                className="input"
                value={filters.text ?? ''}
                onChange={(e) => update({ text: e.target.value })}
              />
            </div>
            <p role="status" className="text-sm font-medium sm:order-last sm:w-full">
              {t('results', {
                shown: visible.length,
                total: entries.length,
                copies: shownTotals.copies,
                value: money(shownTotals.valueUsd),
              })}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="colecao-ordem">
                  {t('sort')}
                </label>
                <select
                  id="colecao-ordem"
                  className="select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as CollectionSort)}
                >
                  {COLLECTION_SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`sorts.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div role="group" aria-label={t('view')} className="flex gap-1">
                {(['gallery', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    className={view === v ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setView(v)}
                  >
                    <Icon name={v} />
                    {t(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === 'gallery' ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
              {page.map((entry) => (
                <li key={entry.id}>
                  <GalleryTile entry={entry} onOpen={open} />
                </li>
              ))}
            </ul>
          ) : (
            <CollectionTable entries={page} onOpen={open} />
          )}

          {visible.length > limit && (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setLimit((l) => l + PAGE)}
            >
              {t('showMore', { count: Math.min(PAGE, visible.length - limit) })}
            </button>
          )}
        </>
      )}

      {current && (
        <EntryDialog
          entry={current}
          money={money}
          onClose={() => {
            setOpenId(null);
            opener.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function GalleryTile({
  entry,
  onOpen,
}: {
  entry: CollectionViewEntry;
  onOpen: (entry: CollectionViewEntry, el: HTMLElement) => void;
}) {
  const t = useTranslations('collection');
  const td = useTranslations('decks');
  const image = entry.card?.imageUri;
  return (
    <div className="relative space-y-1">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${t('open', { name: entry.name })} (${t('copies', { count: entry.quantity })})`}
        className={`relative block aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] bg-surface-muted shadow-sm ${
          entry.foil && image ? 'holo' : ''
        }`}
        onClick={(e) => onOpen(entry, e.currentTarget)}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            unoptimized
            loading="lazy"
            sizes="(min-width: 1280px) 12vw, (min-width: 768px) 16vw, 33vw"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-1 text-center text-xs font-medium">
            {entry.name}
          </span>
        )}
        {entry.foil && image && <span aria-hidden="true" className="foil-sheen" />}
        {entry.foil && image && <HoloLayers foil />}
      </button>
      {/* Fora do botão (o nome dele já diz as cópias), para o texto visível bater com o nome. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 rounded-md bg-noite/85 px-1.5 py-0.5 text-xs font-bold text-pergaminho tabular-nums"
      >
        ×{entry.quantity}
      </span>
      <p className="flex flex-wrap items-center gap-1 text-xs">
        {entry.foil && (
          <span className="inline-flex items-center rounded bg-teal-100 px-1 font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100">
            <span aria-hidden="true">✦</span> {td('foil')}
          </span>
        )}
        {entry.decks.length > 0 ? (
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Icon name="decks" className="size-3.5 shrink-0" />
            {t('inDecks', { count: entry.decks.length })}
          </span>
        ) : (
          <span className="muted">{t('notInDecks')}</span>
        )}
      </p>
    </div>
  );
}

function CollectionTable({
  entries,
  onOpen,
}: {
  entries: CollectionViewEntry[];
  onOpen: (entry: CollectionViewEntry, el: HTMLElement) => void;
}) {
  const t = useTranslations('collection');
  const td = useTranslations('decks');
  const format = useFormatter();
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="bg-surface-muted text-left">
          <tr>
            {(['colName', 'colSet', 'colRarity', 'colYear', 'colArtist'] as const).map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-semibold">
                {t(c)}
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              {t('colQuantity')}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              {t('colPrice')}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {t('colDecks')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const price = unitPriceUsd(entry);
            const rarity = entry.card?.rarity;
            return (
              <tr key={entry.id} className="border-t border-line">
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    className="cursor-pointer text-left font-medium underline decoration-fg-muted/60 decoration-dotted underline-offset-2 hover:decoration-solid"
                    onClick={(e) => onOpen(entry, e.currentTarget)}
                  >
                    {entry.name}
                  </button>
                  {entry.foil && (
                    <span className="ms-1 text-xs font-medium">
                      <span aria-hidden="true">✦</span> {td('foil')}
                    </span>
                  )}
                  {!entry.card && <span className="muted text-xs"> ({t('unknownCard')})</span>}
                </td>
                <td className="px-3 py-1.5">{printLabel(entry.card) ?? '—'}</td>
                <td className="px-3 py-1.5">
                  {rarity && (COLLECTION_RARITIES as readonly string[]).includes(rarity)
                    ? t(`rarities.${rarity as (typeof COLLECTION_RARITIES)[number]}`)
                    : '—'}
                </td>
                <td className="px-3 py-1.5 tabular-nums">{releaseYear(entry) ?? '—'}</td>
                <td className="px-3 py-1.5">{entry.card?.artist ?? '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{entry.quantity}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {price === null
                    ? t('noPrice')
                    : format.number(price * entry.quantity, { style: 'currency', currency: 'USD' })}
                </td>
                <td className="px-3 py-1.5">
                  {entry.decks.length ? entry.decks.map((d) => d.deckName).join(', ') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Filters({
  filters,
  update,
  reset,
  facets,
}: {
  filters: CollectionFilters;
  update: (patch: Partial<CollectionFilters>) => void;
  reset: () => void;
  facets: ReturnType<typeof collectionFacets>;
}) {
  const t = useTranslations('collection');
  const colorName = useColorName();
  const id = useId();
  const active = activeCount(filters);
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">
        <Icon name="filter" className="me-1 inline size-4 align-[-2px]" />
        {t('filtersTitle')}{' '}
        <span className="muted font-normal">({t('activeFilters', { count: active })})</span>
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="label" htmlFor={`${id}-artist`}>
            {t('artist')}
          </label>
          <input
            id={`${id}-artist`}
            type="search"
            className="input"
            list={`${id}-artists`}
            value={filters.artist ?? ''}
            onChange={(e) => update({ artist: e.target.value })}
          />
          <datalist id={`${id}-artists`}>
            {facets.artists.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor={`${id}-set`}>
              {t('set')}
            </label>
            <select
              id={`${id}-set`}
              className="select"
              value={filters.set ?? ''}
              onChange={(e) => update({ set: e.target.value || undefined })}
            >
              <option value="">{t('any')}</option>
              {facets.sets.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-year`}>
              {t('year')}
            </label>
            <select
              id={`${id}-year`}
              className="select"
              value={filters.year ?? ''}
              onChange={(e) =>
                update({ year: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">{t('any')}</option>
              {facets.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">{t('colors')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {COLLECTION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={Boolean(filters.colors?.includes(c))}
                className={`${filters.colors?.includes(c) ? 'btn-primary' : 'btn-secondary'} px-2`}
                onClick={() => update({ colors: toggle<CollectionColor>(filters.colors, c) })}
              >
                <ManaSymbol symbol={c} />
                <span className="text-xs">{colorName(c)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {(['any', 'exact'] as const).map((mode) => (
              <label key={mode} className="inline-flex min-h-6 items-center gap-1.5">
                <input
                  type="radio"
                  name={`${id}-mode`}
                  checked={(filters.colorMode ?? 'any') === mode}
                  onChange={() => update({ colorMode: mode })}
                />
                {t(mode === 'any' ? 'colorModeAny' : 'colorModeExact')}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="label">{t('cost')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {COLLECTION_CMCS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={Boolean(filters.cmcs?.includes(n))}
                className={`${filters.cmcs?.includes(n) ? 'btn-primary' : 'btn-secondary'} min-w-10 px-2 tabular-nums`}
                onClick={() => update({ cmcs: toggle(filters.cmcs, n) })}
              >
                {n === 7 ? t('cmcPlus') : n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="label">{t('types')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {COLLECTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={Boolean(filters.types?.includes(type))}
                className={`${filters.types?.includes(type) ? 'btn-primary' : 'btn-secondary'} px-2 text-sm`}
                onClick={() => update({ types: toggle<CollectionType>(filters.types, type) })}
              >
                {t(`typesList.${type}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-3 md:col-span-2 xl:col-span-3">
          <div>
            <label className="label" htmlFor={`${id}-rarity`}>
              {t('rarity')}
            </label>
            <select
              id={`${id}-rarity`}
              className="select"
              value={filters.rarity ?? ''}
              onChange={(e) => update({ rarity: e.target.value || undefined })}
            >
              <option value="">{t('any')}</option>
              {COLLECTION_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {t(`rarities.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-foil`}>
              {t('foil')}
            </label>
            <select
              id={`${id}-foil`}
              className="select"
              value={filters.foil ?? 'all'}
              onChange={(e) => update({ foil: e.target.value as CollectionFilters['foil'] })}
            >
              <option value="all">{t('foilAll')}</option>
              <option value="foil">{t('foilOnly')}</option>
              <option value="nonfoil">{t('nonFoil')}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-deck`}>
              {t('inDeck')}
            </label>
            <select
              id={`${id}-deck`}
              className="select"
              value={filters.inDeck ?? 'all'}
              onChange={(e) => update({ inDeck: e.target.value as CollectionFilters['inDeck'] })}
            >
              <option value="all">{t('inDeckAll')}</option>
              <option value="yes">{t('inDeckYes')}</option>
              <option value="no">{t('inDeckNo')}</option>
            </select>
          </div>
        </div>
      </div>
      {active > 0 && (
        <button type="button" className="btn-secondary mt-4" onClick={reset}>
          <Icon name="close" />
          {t('clear')}
        </button>
      )}
    </details>
  );
}

function AddToCollection({ empty }: { empty: boolean }) {
  const t = useTranslations('collection');
  const id = useId();
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [foil, setFoil] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <details className="card" open={empty}>
      <summary className="cursor-pointer font-semibold">
        <Icon name="add" className="me-1 inline size-4 align-[-2px]" />
        {t('addTitle')}
      </summary>
      <form
        className="mt-4 space-y-3"
        aria-label={t('addTitle')}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setDone(null);
          void run(
            () =>
              api<{ name: string }>('/api/v1/collection', {
                method: 'POST',
                body: { name: name.trim(), quantity: Number(quantity) || 1, foil },
              }),
            (r) => {
              setDone(t('added', { name: r.name }));
              setName('');
              setQuantity('1');
              setFoil(false);
            },
          );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem_auto_auto] sm:items-end">
          <CardSearch id={`${id}-name`} label={t('addCard')} value={name} onChange={setName} />
          <div>
            <label className="label" htmlFor={`${id}-q`}>
              {t('addQuantity')}
            </label>
            <input
              id={`${id}-q`}
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={foil} onChange={(e) => setFoil(e.target.checked)} />
            <span aria-hidden="true">✦</span> {t('addFoil')}
          </label>
          <button type="submit" className="btn-primary" disabled={pending || !name.trim()}>
            <Icon name="add" />
            {t('add')}
          </button>
        </div>
        <p role="status" className="text-sm text-success">
          {done ?? ''}
        </p>
        <FormError message={error} />
      </form>
    </details>
  );
}

function EntryDialog({
  entry,
  money,
  onClose,
}: {
  entry: CollectionViewEntry;
  money: (usd: number) => string;
  onClose: () => void;
}) {
  const t = useTranslations('collection');
  const td = useTranslations('decks');
  const id = useId();
  const [back, setBack] = useState(false);
  const { run, error, pending } = useApiAction();
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const price = unitPriceUsd(entry);

  const patch = (body: { quantity?: number; foil?: boolean; scryfallId?: string }) =>
    run(
      () => api(`/api/v1/collection/${entry.id}`, { method: 'PATCH', body }),
      () => setMessage(t('saved', { name: entry.name })),
    );
  const commitQuantity = () => {
    const n = Number(quantity);
    if (!Number.isInteger(n) || n < 1 || n > 999 || n === entry.quantity) return;
    void patch({ quantity: n });
  };

  return (
    <CardDialog
      open
      name={entry.name}
      card={entry.card ? { ...entry.card, name: entry.name } : null}
      back={back}
      onBackChange={setBack}
      foil={entry.foil}
      onClose={onClose}
      price={
        <p className="text-sm">
          {price === null
            ? t('noPrice')
            : `${t('unitPrice', { price: money(price) })} · ${money(price * entry.quantity)}`}
        </p>
      }
    >
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{t('decksTitle')}</h3>
          {entry.decks.length ? (
            <ul className="mt-1 space-y-0.5 text-sm">
              {entry.decks.map((d) => (
                <li key={d.deckId}>
                  <Link
                    href={`/decks/${d.deckId}`}
                    className="text-link underline underline-offset-2"
                  >
                    {t('deckUse', { deck: d.deckName, quantity: d.quantity, proxies: d.proxies })}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">{t('notInDecks')}</p>
          )}
        </div>
        <fieldset className="space-y-3 rounded-xl border border-line px-3 pt-1 pb-3">
          <legend className="px-1 text-sm font-semibold">{t('edit')}</legend>
          {/* Linha 1: as cópias e o acabamento. Linha 2: as ações. */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="w-24">
              <label className="label" htmlFor={`${id}-q`}>
                {t('quantity')}
              </label>
              <input
                id={`${id}-q`}
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                className="input"
                value={quantity}
                disabled={pending}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={commitQuantity}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitQuantity();
                  }
                }}
              />
            </div>
            <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={entry.foil}
                disabled={pending}
                onChange={(e) => void patch({ foil: e.target.checked })}
              />
              <span aria-hidden="true">✦</span> {td('foil')}
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {entry.card && (
              <PrintPicker
                line={{
                  name: entry.name,
                  board: 'collection',
                  quantity: entry.quantity,
                  scryfallId: entry.scryfallId,
                  card: entry.card,
                }}
                onPick={(toScryfallId, amount) =>
                  // Uma chamada só: as cópias mudam de impressão na coleção e nos decks (senão a
                  // sincronia com os decks traria a impressão antiga de volta).
                  api(`/api/v1/collection/${entry.id}`, {
                    method: 'PATCH',
                    body: { scryfallId: toScryfallId, copies: amount },
                  })
                }
              />
            )}
            <button
              type="button"
              className={`${confirming ? 'btn-danger border border-danger' : 'btn-danger'} ms-auto`}
              disabled={pending}
              onBlur={() => setConfirming(false)}
              onClick={() => {
                if (!confirming) return setConfirming(true);
                setConfirming(false);
                void run(
                  () => api(`/api/v1/collection/${entry.id}`, { method: 'DELETE' }),
                  onClose,
                );
              }}
            >
              <Icon name="delete" />
              {confirming ? t('confirmRemove') : t('remove')}
            </button>
          </div>
        </fieldset>
        <p role="status" className="text-sm text-success">
          {message ?? ''}
        </p>
        <FormError message={error} />
      </div>
    </CardDialog>
  );
}
