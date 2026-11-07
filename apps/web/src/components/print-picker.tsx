'use client';

import type { CardPrint } from '@boramarcar/core';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';

export interface PrintLine {
  name: string;
  board: string;
  quantity: number;
  scryfallId: string | null;
  card: { setCode?: string | null; collectorNumber?: string | null } | null;
}

/** "CMM #400" — ou `null` quando a edição não é conhecida. */
export function printLabel(card: PrintLine['card']) {
  if (!card?.setCode) return null;
  return `${card.setCode.toUpperCase()}${card.collectorNumber ? ` #${card.collectorNumber}` : ''}`;
}

/**
 * Botão "Edição: CMM #400" que abre um diálogo para escolher a impressão da carta (todas as
 * edições em papel, mais novas primeiro) e quantas cópias usam essa edição.
 */
export function PrintPicker({ deckId, line }: { deckId: string; line: PrintLine }) {
  const t = useTranslations('decks');
  const te = useTranslations('errors');
  const tc = useTranslations('common');
  const format = useFormatter();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const { run, error, pending } = useApiAction();
  const [open, setOpen] = useState(false);
  const [prints, setPrints] = useState<CardPrint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [chosen, setChosen] = useState<string | null>(line.scryfallId);
  const [copies, setCopies] = useState(String(line.quantity));
  const current = printLabel(line.card);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const show = () => {
    setOpen(true);
    setChosen(line.scryfallId);
    setCopies(String(line.quantity));
    setFilter('');
    if (prints) return;
    setLoadError(null);
    api<{ prints: CardPrint[] }>(`/api/v1/cards/prints?name=${encodeURIComponent(line.name)}`)
      .then((r) => setPrints(r.prints))
      .catch((e: unknown) =>
        setLoadError(
          e instanceof ApiError && e.code === 'upstream_error'
            ? t('printsUnavailable')
            : te('internal_error'),
        ),
      );
  };

  const term = filter.trim().toLowerCase();
  const visible = (prints ?? []).filter(
    (p) =>
      !term ||
      p.setName.toLowerCase().includes(term) ||
      p.setCode.toLowerCase() === term ||
      p.collectorNumber === term,
  );
  const amount = Number(copies);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= line.quantity;

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="mt-0.5 inline-flex items-center gap-1 rounded text-xs text-brand-700 underline underline-offset-2 dark:text-brand-300"
        aria-haspopup="dialog"
        onClick={show}
      >
        <Icon name="edit" className="size-3.5 shrink-0" />
        {current ? t('printCurrent', { print: current }) : t('printChoose')}
        <span className="sr-only"> ({line.name})</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto max-h-[90vh] w-[min(94vw,44rem)] overflow-hidden rounded-2xl bg-surface p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/70 dark:bg-ink-900 dark:text-ink-100"
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {open && (
          <form
            className="flex max-h-[90vh] flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (!chosen || !valid || chosen === line.scryfallId) {
                dialog.current?.close();
                return;
              }
              void run(
                () =>
                  api(`/api/v1/decks/${deckId}/lines/print`, {
                    method: 'POST',
                    body: {
                      name: line.name,
                      board: line.board,
                      fromScryfallId: line.scryfallId,
                      toScryfallId: chosen,
                      quantity: amount,
                    },
                  }),
                () => dialog.current?.close(),
              );
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink-200 p-4 dark:border-ink-800">
              <div>
                <h2 id={`${id}-title`} className="text-lg font-semibold">
                  {t('printTitle', { name: line.name })}
                </h2>
                <p className="muted text-sm">{t('printHint')}</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="close" />
                {t('close')}
              </button>
            </div>

            <div className="grid gap-3 border-b border-ink-200 p-4 sm:grid-cols-[1fr_auto] dark:border-ink-800">
              <div>
                <label className="label" htmlFor={`${id}-filter`}>
                  {t('printFilter')}
                </label>
                <input
                  id={`${id}-filter`}
                  className="input"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              {line.quantity > 1 && (
                <div>
                  <label className="label" htmlFor={`${id}-copies`}>
                    {t('printCopies', { total: line.quantity })}
                  </label>
                  <input
                    id={`${id}-copies`}
                    className="input w-28"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={line.quantity}
                    value={copies}
                    onChange={(e) => setCopies(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="min-h-40 flex-1 overflow-y-auto p-4" aria-busy={!prints && !loadError}>
              {loadError ? (
                <FormError message={loadError} />
              ) : !prints ? (
                <p className="muted">{t('printsLoading')}</p>
              ) : (
                <fieldset>
                  <legend className="sr-only">{t('printsLegend', { name: line.name })}</legend>
                  <p role="status" className="muted mb-3 text-sm">
                    {t('printsCount', { count: visible.length })}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {visible.map((p) => (
                      <label
                        key={p.scryfallId}
                        className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-transparent p-1.5 text-xs has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 dark:has-[:checked]:bg-brand-700/20"
                      >
                        <span className="relative block aspect-[488/680] overflow-hidden rounded-[4.5%/3.2%] bg-ink-200 dark:bg-ink-800">
                          {p.imageUri && (
                            <Image
                              src={p.imageUri}
                              alt=""
                              fill
                              unoptimized
                              loading="lazy"
                              sizes="10rem"
                              className="object-cover"
                            />
                          )}
                        </span>
                        <span className="flex items-start gap-1.5">
                          <input
                            type="radio"
                            name={`${id}-print`}
                            className="mt-0.5"
                            checked={chosen === p.scryfallId}
                            onChange={() => setChosen(p.scryfallId)}
                          />
                          <span>
                            <span className="block font-medium">{p.setName}</span>
                            <span className="muted block">
                              {p.setCode.toUpperCase()} #{p.collectorNumber}
                              {p.priceUsd &&
                                ` · ${format.number(Number(p.priceUsd), { style: 'currency', currency: 'USD' })}`}
                            </span>
                            {p.scryfallId === line.scryfallId && (
                              <span className="block font-medium">{t('printInUse')}</span>
                            )}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-200 p-4 dark:border-ink-800">
              <div className="me-auto">
                <FormError message={error ?? (valid ? null : t('printCopiesInvalid'))} />
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dialog.current?.close()}
              >
                {tc('cancel')}
              </button>
              <button className="btn-primary" disabled={pending || !prints || !chosen || !valid}>
                <Icon name="save" />
                {t('printSave')}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
