'use client';

import type { CardPrint } from '@boramarcar/core';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, ApiError } from '@/lib/api';
import { Icon } from './icons';
import { FormError, useApiAction } from './use-api-action';
import { useLightDismiss } from './use-light-dismiss';

export interface PrintLine {
  name: string;
  board: string;
  quantity: number;
  scryfallId: string | null;
  /** Só as cópias foil (`true`) ou comuns (`false`) mudam de edição; sem valor, qualquer uma. */
  foil?: boolean;
  card: { setCode?: string | null; collectorNumber?: string | null } | null;
}

/** "CMM #400" — ou `null` quando a edição não é conhecida. */
export function printLabel(card: PrintLine['card']) {
  if (!card?.setCode) return null;
  return `${card.setCode.toUpperCase()}${card.collectorNumber ? ` #${card.collectorNumber}` : ''}`;
}

/** Impressões desenhadas de cada vez (terrenos básicos têm mais de mil). */
const PRINTS_PAGE = 60;

/**
 * A impressão casa com o filtro? Cada palavra precisa bater com o código da edição, o número de
 * colecionador ou parte do nome da edição: "pca 137", "pca #137", "lord of the rings 262".
 */
export function matchesPrint(
  p: { setCode: string; setName: string; collectorNumber: string; artist?: string | null },
  filter: string,
) {
  const tokens = filter.toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean);
  const setName = p.setName.toLowerCase();
  const artist = (p.artist ?? '').toLowerCase();
  const code = p.setCode.toLowerCase();
  const number = p.collectorNumber.toLowerCase();
  // Palavras que não são código nem número precisam aparecer juntas no nome da edição ou no
  // nome do ilustrador (cartas antigas não têm código nem número impressos).
  const words = tokens.filter((t) => t !== code && t !== number).join(' ');
  return words.length === 0 || setName.includes(words) || (artist !== '' && artist.includes(words));
}

/**
 * Botão "Edição: CMM #400" que abre um diálogo para escolher a impressão da carta (todas as
 * edições em papel, mais novas primeiro) e quantas cópias usam essa edição.
 */
export function PrintPicker({
  deckId,
  line,
  onPick,
  onSelect,
  onSkip,
  selected,
  openLabel,
  saveLabel,
}: {
  deckId?: string;
  line: PrintLine;
  /** Em vez de mover no deck: o que fazer com a impressão escolhida (ex.: na coleção). */
  onPick?: (toScryfallId: string, quantity: number) => Promise<unknown>;
  /**
   * Só escolher (sem salvar nada): devolve a impressão e fecha. Usado para escolher a edição
   * antes de adicionar à coleção ou de separar cópias. Sem o campo de quantidade.
   */
  onSelect?: (print: CardPrint) => void;
  /**
   * Com `onSelect`, se o Scryfall não responder: oferece seguir sem escolher (a impressão padrão
   * do Scryfall, trocada depois). Recebe o texto do botão.
   */
  onSkip?: { label: string; run: () => void };
  /** Com `onSelect`: a impressão já escolhida (marcada ao abrir). */
  selected?: string | null;
  /** Texto do botão que abre (padrão: "Edição: …"). */
  openLabel?: string;
  /** Texto do botão de confirmar (padrão: "Salvar edição"). */
  saveLabel?: string;
}) {
  const t = useTranslations('decks');
  const te = useTranslations('errors');
  const tc = useTranslations('common');
  const format = useFormatter();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useLightDismiss(dialog);
  const opener = useRef<HTMLButtonElement>(null);
  const { run, error, pending } = useApiAction();
  const [open, setOpen] = useState(false);
  // O diálogo vai para o <body> (portal) a partir da primeira abertura: o seletor pode estar
  // dentro de outro formulário (adicionar à coleção, separar cópias), e form dentro de form
  // quebra o HTML.
  const [mounted, setMounted] = useState(false);
  const [prints, setPrints] = useState<CardPrint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(PRINTS_PAGE);
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
    setMounted(true);
    setOpen(true);
    setChosen(onSelect ? (selected ?? null) : line.scryfallId);
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

  const visible = (prints ?? []).filter((p) => matchesPrint(p, filter));
  const shown = visible.slice(0, limit);
  const amount = onSelect ? line.quantity : Number(copies);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= Math.max(1, line.quantity);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="btn-secondary"
        aria-haspopup="dialog"
        onClick={show}
      >
        <Icon name="edit" />
        {openLabel ?? (current ? t('printCurrent', { print: current }) : t('printChoose'))}
        <span className="sr-only"> ({line.name})</span>
      </button>
      {mounted &&
        createPortal(
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
                  // O evento do React sobe pela árvore (mesmo no portal): não envia o formulário de fora.
                  e.stopPropagation();
                  if (onSelect) {
                    const print = prints?.find((p) => p.scryfallId === chosen);
                    if (print) onSelect(print);
                    dialog.current?.close();
                    return;
                  }
                  if (!chosen || !valid || chosen === line.scryfallId) {
                    dialog.current?.close();
                    return;
                  }
                  void run(
                    () =>
                      onPick
                        ? onPick(chosen, amount)
                        : api(`/api/v1/decks/${deckId}/lines/print`, {
                            method: 'POST',
                            body: {
                              name: line.name,
                              board: line.board,
                              fromScryfallId: line.scryfallId,
                              toScryfallId: chosen,
                              quantity: amount,
                              ...(line.foil === undefined ? {} : { foil: line.foil }),
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
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setLimit(PRINTS_PAGE);
                      }}
                    />
                  </div>
                  {!onSelect && line.quantity > 1 && (
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
                        aria-describedby={`${id}-copies-hint`}
                        onChange={(e) => setCopies(e.target.value)}
                      />
                      {/* Diz o que acontece com o resto: separar cópias de edição é isto. */}
                      <p id={`${id}-copies-hint`} className="muted mt-1 max-w-56 text-xs">
                        {valid ? t('printCopiesRest', { rest: line.quantity - amount }) : null}
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className="min-h-40 flex-1 overflow-y-auto p-4"
                  aria-busy={!prints && !loadError}
                >
                  {loadError ? (
                    <div className="space-y-3">
                      <FormError message={loadError} />
                      {onSkip && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            onSkip.run();
                            dialog.current?.close();
                          }}
                        >
                          {onSkip.label}
                        </button>
                      )}
                    </div>
                  ) : !prints ? (
                    <p className="muted">{t('printsLoading')}</p>
                  ) : (
                    <fieldset>
                      <legend className="sr-only">{t('printsLegend', { name: line.name })}</legend>
                      <p role="status" className="muted mb-3 text-sm">
                        {t('printsCount', { count: visible.length })}
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {shown.map((p) => (
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
                                {p.artist && <span className="muted block">{p.artist}</span>}
                                {!onSelect && p.scryfallId === line.scryfallId && (
                                  <span className="block font-medium">{t('printInUse')}</span>
                                )}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {visible.length > limit && (
                        <button
                          type="button"
                          className="btn-secondary mt-3 w-full"
                          onClick={() => setLimit((l) => l + PRINTS_PAGE)}
                        >
                          {t('printsMore', {
                            count: Math.min(PRINTS_PAGE, visible.length - limit),
                          })}
                        </button>
                      )}
                    </fieldset>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-200 p-4 dark:border-ink-800">
                  <div className="me-auto">
                    <FormError
                      message={error ?? (valid || onSelect ? null : t('printCopiesInvalid'))}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => dialog.current?.close()}
                  >
                    {tc('cancel')}
                  </button>
                  <button
                    className="btn-primary"
                    disabled={pending || !prints || !chosen || !valid}
                  >
                    <Icon name="save" />
                    {saveLabel ??
                      (valid && amount < line.quantity
                        ? t('printSavePart', { count: amount, total: line.quantity })
                        : t('printSave'))}
                  </button>
                </div>
              </form>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
