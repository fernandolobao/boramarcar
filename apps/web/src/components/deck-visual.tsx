'use client';

import { DECK_BOARDS, GAME_FORMATS, groupEntriesByType, type GameFormat } from '@boramarcar/core';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { ProxyToggle } from './deck-forms';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;
/** Fundos claros com letra escura: contraste ≥ 7:1 em qualquer tema. */
const PIP_STYLE: Record<string, string> = {
  W: 'bg-[#f8e7b9] text-zinc-900',
  U: 'bg-[#a9d3f5] text-[#0b2440]',
  B: 'bg-[#c9c2bf] text-zinc-950',
  R: 'bg-[#f6b39b] text-[#3f0d02]',
  G: 'bg-[#9bd3ae] text-[#05301a]',
  C: 'bg-[#dcd9d6] text-zinc-900',
};

/** Identidade de cor como símbolos com letra (cor não é a única pista) e nome para leitores de tela. */
export function ColorIdentity({ colors, size = 'md' }: { colors: string[]; size?: 'sm' | 'md' }) {
  const t = useTranslations('decks');
  const list = COLOR_ORDER.filter((c) => colors.includes(c));
  const shown = list.length ? list : (['C'] as const);
  const names = shown.map((c) => t(`colors.${c}`)).join(', ');
  const dim = size === 'sm' ? 'size-5 text-[0.65rem]' : 'size-6 text-xs';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="sr-only">
        {t('colorIdentity')}: {names}
      </span>
      {shown.map((c) => (
        <span
          key={c}
          aria-hidden="true"
          title={t(`colors.${c}`)}
          className={`inline-grid ${dim} place-items-center rounded-full border border-zinc-900/30 font-bold shadow-sm ${PIP_STYLE[c]}`}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

interface Entry {
  id: string;
  name: string;
  quantity: number;
  board: (typeof DECK_BOARDS)[number];
  isProxy: boolean;
  card: {
    typeLine: string;
    cmc: number;
    manaCost?: string | null;
    imageUri?: string | null;
  } | null;
}

/**
 * Cartas do deck em dois modos: **visual** (imagens agrupadas por tipo, com ampliação em diálogo)
 * e **lista** (tabela compacta). Funciona em celular, tablet e desktop.
 */
export function DeckCards({
  deckId,
  entries,
  isOwner,
}: {
  deckId: string;
  entries: Entry[];
  isOwner: boolean;
}) {
  const t = useTranslations('decks');
  const [view, setView] = useState<'visual' | 'list'>('visual');
  const [zoomed, setZoomed] = useState<Entry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (zoomed && !d.open) d.showModal();
    if (!zoomed && d.open) d.close();
  }, [zoomed]);

  const boards = DECK_BOARDS.map((board) => {
    const own = entries.filter((e) => e.board === board);
    return {
      board,
      count: own.reduce((sum, e) => sum + e.quantity, 0),
      // Comandante e boards secundários ficam juntos; o deck principal é separado por tipo.
      groups:
        board === 'mainboard'
          ? groupEntriesByType(own).map((g) => ({
              key: g.group,
              title: t(`types.${g.group}`),
              count: g.count,
              entries: g.entries,
            }))
          : own.length
            ? [
                {
                  key: board,
                  title: t(`boards.${board}`),
                  count: own.reduce((s, e) => s + e.quantity, 0),
                  entries: own,
                },
              ]
            : [],
    };
  }).filter((b) => b.count > 0);

  const proxy = (entry: Entry) =>
    isOwner ? (
      <label className="inline-flex min-h-6 items-center gap-1.5 text-xs">
        <ProxyToggle
          deckId={deckId}
          cardId={entry.id}
          isProxy={entry.isProxy}
          label={`${t('proxy')}: ${entry.name}`}
        />
        {t('proxy')}
      </label>
    ) : entry.isProxy ? (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {t('proxy')}
      </span>
    ) : null;

  return (
    <section className="card space-y-5" aria-labelledby="deck-cards-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="deck-cards-title" className="section-title mb-0">
          {t('cardsTitle')}
        </h2>
        <div role="group" aria-label={t('view')} className="flex gap-2">
          {(['visual', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={view === v ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setView(v)}
            >
              <Icon name={v === 'visual' ? 'gallery' : 'list'} />
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
      </div>

      {boards.map(({ board, groups }) =>
        groups.map((group) => (
          <section
            key={`${board}-${group.key}`}
            aria-labelledby={`${titleId}-${board}-${group.key}`}
          >
            <h3 id={`${titleId}-${board}-${group.key}`} className="mb-2 font-semibold">
              {t('groupTitle', { name: group.title, count: group.count })}
            </h3>
            {view === 'visual' ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1">
                    <div className="relative transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                      <button
                        type="button"
                        className="group relative block aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] bg-zinc-200 shadow-sm ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-zinc-800"
                        aria-label={t('zoom', { name: entry.name })}
                        aria-haspopup="dialog"
                        onClick={(e) => {
                          opener.current = e.currentTarget;
                          setZoomed(entry);
                        }}
                      >
                        {entry.card?.imageUri ? (
                          <Image
                            src={entry.card.imageUri}
                            alt=""
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                            className="object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center p-2 text-center text-sm font-medium">
                            {entry.name}
                          </span>
                        )}
                      </button>
                      {/* Selos fora do botão: o nome acessível fica só "Ampliar …" (WCAG 2.5.3). */}
                      {entry.quantity > 1 && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-[8%] left-1.5 rounded-md bg-zinc-950/85 px-1.5 py-0.5 text-xs font-bold text-white"
                        >
                          {t('quantity', { count: entry.quantity })}
                        </span>
                      )}
                      {entry.isProxy && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-[8%] right-1.5 rounded-md bg-amber-300 px-1.5 py-0.5 text-xs font-bold text-amber-950"
                        >
                          {t('proxy')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium" title={entry.name}>
                      {entry.quantity > 1 && `${entry.quantity}× `}
                      {entry.name}
                      {entry.isProxy && !isOwner && (
                        <span className="sr-only"> ({t('proxy')})</span>
                      )}
                    </p>
                    {isOwner && proxy(entry)}
                  </li>
                ))}
              </ul>
            ) : (
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">{t('quantityHeader')}</th>
                    <th scope="col">{t('name')}</th>
                    <th scope="col">{t('type')}</th>
                    <th scope="col">{t('proxy')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="w-10 py-1.5 tabular-nums">{entry.quantity}</td>
                      <td className="py-1.5">
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          aria-haspopup="dialog"
                          onClick={(e) => {
                            opener.current = e.currentTarget;
                            setZoomed(entry);
                          }}
                        >
                          {entry.name}
                        </button>
                        {!entry.card && <span className="muted"> ({t('notFoundCard')})</span>}
                      </td>
                      <td className="muted hidden py-1.5 sm:table-cell">{entry.card?.typeLine}</td>
                      <td className="py-1.5 text-right">{proxy(entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )),
      )}

      <dialog
        ref={dialog}
        aria-labelledby={`${titleId}-zoom`}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl bg-white p-4 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/70 dark:bg-zinc-900 dark:text-zinc-100"
        onClose={() => {
          setZoomed(null);
          opener.current?.focus();
        }}
      >
        {zoomed && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 id={`${titleId}-zoom`} className="text-lg font-semibold">
                {zoomed.name}
              </h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="close" />
                {t('close')}
              </button>
            </div>
            {zoomed.card?.imageUri ? (
              <div className="relative aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%]">
                <Image
                  src={zoomed.card.imageUri}
                  alt={zoomed.name}
                  fill
                  unoptimized
                  sizes="26rem"
                  className="object-cover"
                />
              </div>
            ) : (
              <p className="muted">{t('noImage')}</p>
            )}
            {zoomed.card && (
              <p className="muted text-sm">
                {zoomed.card.typeLine}
                {zoomed.card.manaCost && ` · ${zoomed.card.manaCost}`}
              </p>
            )}
            {zoomed.isProxy && <p className="text-sm font-medium">{t('proxy')}</p>}
          </div>
        )}
      </dialog>
    </section>
  );
}

/** Nome e tipo de jogo do deck (dono). */
export function DeckSettingsForm({
  deckId,
  name,
  format,
}: {
  deckId: string;
  name: string;
  format: GameFormat;
}) {
  const t = useTranslations('decks');
  const tf = useTranslations('formats');
  const tc = useTranslations('common');
  const { run, error, pending } = useApiAction();
  const [values, setValues] = useState({ name, format });
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () => api(`/api/v1/decks/${deckId}`, { method: 'PATCH', body: values }),
          () => setSaved(true),
        );
      }}
    >
      <div>
        <label className="label" htmlFor="deck-name">
          {t('name')}
        </label>
        <input
          id="deck-name"
          className="input"
          required
          maxLength={120}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="label" htmlFor="deck-format">
          {t('format')}
        </label>
        <select
          id="deck-format"
          className="select"
          value={values.format}
          onChange={(e) => setValues((v) => ({ ...v, format: e.target.value as GameFormat }))}
        >
          {GAME_FORMATS.map((f) => (
            <option key={f} value={f}>
              {tf(f)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>
        <Icon name="save" />
        {tc('save')}
      </button>
      {saved && !error && (
        <p role="status" className="muted sm:col-span-3">
          {t('saved')}
        </p>
      )}
      <div className="sm:col-span-3">
        <FormError message={error} />
      </div>
    </form>
  );
}
