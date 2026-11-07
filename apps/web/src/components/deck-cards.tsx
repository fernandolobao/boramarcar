'use client';

import { DECK_BOARDS, groupEntriesByType, MAX_COPIES, type DeckBoard } from '@boramarcar/core';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { CardDialog } from './card-dialog';
import { CardSearch } from './card-search';
import { Icon } from './icons';
import { ManaCost } from './mana';
import { printLabel, PrintPicker } from './print-picker';
import { FormError, useApiAction } from './use-api-action';

export interface DeckLineView {
  key: string;
  name: string;
  board: DeckBoard;
  quantity: number;
  proxies: number;
  /** Todas as cópias são foil. */
  foil?: boolean;
  /** Edição (impressão) da linha. */
  scryfallId: string | null;
  card: {
    typeLine: string;
    cmc: number;
    manaCost?: string | null;
    imageUri?: string | null;
    priceUsd?: string | null;
    setCode?: string | null;
    setName?: string | null;
    collectorNumber?: string | null;
    backImageUri?: string | null;
    backName?: string | null;
  } | null;
}

type View = 'visual' | 'list' | 'edit';

/** Selo de proxy: "Proxy" quando todas as cópias são proxy; senão "3 proxies". */
function ProxyBadge({ line }: { line: DeckLineView }) {
  const t = useTranslations('decks');
  if (!line.proxies) return null;
  return (
    <span className="rounded bg-gold-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-gold-900 dark:bg-gold-900 dark:text-gold-100">
      {line.proxies === line.quantity ? t('proxy') : t('proxyCount', { count: line.proxies })}
    </span>
  );
}

/** Selo de foil (texto + ✦; a cor não é a única pista). */
function FoilBadge({ line }: { line: DeckLineView }) {
  const t = useTranslations('decks');
  if (!line.foil) return null;
  return (
    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-teal-900 dark:bg-teal-900 dark:text-teal-100">
      <span aria-hidden="true">✦ </span>
      {t('foil')}
    </span>
  );
}

/**
 * Cartas do deck: **visual** (imagens por tipo, ampliar em diálogo), **lista** e, para o dono,
 * **editar** (adicionar com busca do Scryfall, mudar quantidades e proxies, remover).
 */
export function DeckCards({
  deckId,
  lines,
  isOwner,
  usdBrl = null,
}: {
  deckId: string;
  lines: DeckLineView[];
  isOwner: boolean;
  /** Cotação do dólar para mostrar o preço da carta também em reais. */
  usdBrl?: number | null;
}) {
  const t = useTranslations('decks');
  const format = useFormatter();
  const [view, setView] = useState<View>('visual');
  const [zoomed, setZoomed] = useState<DeckLineView | null>(null);
  /** Cartas de duas faces mostrando o verso (na grade e no diálogo). */
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const toggleFlip = (key: string) =>
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const imageOf = (line: DeckLineView) =>
    flipped.has(line.key) && line.card?.backImageUri ? line.card.backImageUri : line.card?.imageUri;
  const opener = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const views: View[] = isOwner ? ['visual', 'list', 'edit'] : ['visual', 'list'];
  type Group = { key: string; title: string; count: number; lines: DeckLineView[] };
  const groups = DECK_BOARDS.flatMap((board): Group[] => {
    const own = lines.filter((l) => l.board === board);
    if (!own.length) return [];
    // O deck principal é separado por tipo; comandante e boards secundários ficam juntos.
    return board === 'mainboard'
      ? groupEntriesByType(own.map((l) => ({ ...l, isProxy: l.proxies > 0 }))).map((g) => ({
          key: `${board}-${g.group}`,
          title: t(`types.${g.group}`),
          count: g.count,
          lines: g.entries,
        }))
      : [
          {
            key: board,
            title: t(`boards.${board}`),
            count: own.reduce((s, l) => s + l.quantity, 0),
            lines: own,
          },
        ];
  });

  const openZoom = (line: DeckLineView, button: HTMLButtonElement) => {
    opener.current = button;
    setZoomed(line);
  };

  return (
    <section className="card space-y-5" aria-labelledby="deck-cards-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="deck-cards-title" className="section-title mb-0">
          {t('cardsTitle')}
        </h2>
        <div role="group" aria-label={t('view')} className="flex flex-wrap gap-2">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={view === v ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setView(v)}
            >
              <Icon name={v === 'visual' ? 'gallery' : v === 'list' ? 'list' : 'edit'} />
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
      </div>

      {view === 'edit' && <AddCardForm deckId={deckId} lines={lines} />}

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`${titleId}-${group.key}`}>
          <h3 id={`${titleId}-${group.key}`} className="mb-2 font-semibold">
            {t('groupTitle', { name: group.title, count: group.count })}
          </h3>
          {view === 'visual' ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {group.lines.map((line) => (
                <li key={line.key} className="flex flex-col gap-1">
                  <div className="relative transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <button
                      type="button"
                      className="relative block aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] bg-ink-200 shadow-sm ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-ink-800"
                      aria-label={t('zoom', { name: line.name })}
                      aria-haspopup="dialog"
                      onClick={(e) => openZoom(line, e.currentTarget)}
                    >
                      {imageOf(line) ? (
                        <>
                          <Image
                            src={imageOf(line)!}
                            alt=""
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                            className="object-cover"
                          />
                          {/* Brilho de carta foil (decorativo; parado com "reduzir movimento"). */}
                          {line.foil && <span aria-hidden="true" className="foil-sheen" />}
                        </>
                      ) : (
                        <span className="absolute inset-0 grid place-items-center p-2 text-center text-sm font-medium">
                          {line.name}
                        </span>
                      )}
                    </button>
                    {line.card?.backImageUri && (
                      <button
                        type="button"
                        className="absolute right-1.5 bottom-[6%] inline-flex items-center gap-1 rounded-md bg-ink-950/85 px-1.5 py-1 text-xs font-medium text-white hover:bg-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        aria-pressed={flipped.has(line.key)}
                        onClick={() => toggleFlip(line.key)}
                      >
                        <Icon name="flip" className="size-3.5 shrink-0" />
                        {t('flip')}
                        <span className="sr-only"> ({line.name})</span>
                      </button>
                    )}
                    {/* Selos fora do botão: o nome acessível fica só "Ampliar …" (WCAG 2.5.3). */}
                    {line.quantity > 1 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-[8%] left-1.5 rounded-md bg-ink-950/85 px-1.5 py-0.5 text-xs font-bold text-white"
                      >
                        {t('quantity', { count: line.quantity })}
                      </span>
                    )}
                    {line.foil && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-[6%] left-1.5 rounded-md bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-900"
                      >
                        ✦ {t('foil')}
                      </span>
                    )}
                    {line.proxies > 0 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-[8%] right-1.5 rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-on-accent"
                      >
                        {line.proxies === line.quantity
                          ? t('proxy')
                          : t('proxyCount', { count: line.proxies })}
                      </span>
                    )}
                  </div>
                  <p
                    className="truncate text-xs font-medium"
                    title={[line.name, printLabel(line.card)].filter(Boolean).join(' · ')}
                  >
                    {line.quantity > 1 && `${line.quantity}× `}
                    {line.name}
                    {printLabel(line.card) && (
                      <span className="muted font-normal"> · {printLabel(line.card)}</span>
                    )}
                    {line.proxies > 0 && (
                      <span className="sr-only">
                        {' '}
                        (
                        {line.proxies === line.quantity
                          ? t('proxy')
                          : t('proxyCount', { count: line.proxies })}
                        )
                      </span>
                    )}
                    {line.foil && <span className="sr-only"> ({t('foil')})</span>}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            // table-fixed + <colgroup>: cada grupo é uma tabela, e as larguras fixas deixam as
            // colunas alinhadas entre todos os grupos.
            <table className="w-full table-fixed text-sm">
              {view === 'edit' ? (
                <colgroup>
                  <col className="w-20" />
                  <col />
                  <col className="w-20" />
                  <col className="w-14 sm:w-36" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-10" />
                  <col />
                  <col className="w-28 sm:w-40" />
                  <col className="w-0 sm:w-[30%]" />
                  <col className="w-20 sm:w-24" />
                </colgroup>
              )}
              <thead
                className={
                  view === 'edit' ? 'text-left text-xs text-ink-600 dark:text-ink-400' : 'sr-only'
                }
              >
                <tr>
                  <th
                    scope="col"
                    className={`py-1 pe-2 font-medium ${view === 'edit' ? 'w-20' : ''}`}
                  >
                    {t('quantityHeader')}
                  </th>
                  <th scope="col" className="py-1 pe-2 font-medium">
                    {t('cardName')}
                  </th>
                  {view === 'edit' ? (
                    <>
                      <th scope="col" className="w-20 py-1 pe-2 font-medium">
                        {t('proxiesHeader')}
                      </th>
                      <th scope="col" className="w-14 py-1 font-medium sm:w-36">
                        <span className="sr-only">{t('actions')}</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th scope="col">{t('manaCost')}</th>
                      <th scope="col">{t('type')}</th>
                      <th scope="col">{t('proxy')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {group.lines.map((line) =>
                  view === 'edit' ? (
                    <EditableLine key={line.key} deckId={deckId} line={line} />
                  ) : (
                    <tr key={line.key} className="border-t border-ink-200 dark:border-ink-800">
                      <td className="py-1.5 tabular-nums">{line.quantity}</td>
                      <td className="py-1.5 pe-2 break-words">
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          aria-haspopup="dialog"
                          onClick={(e) => openZoom(line, e.currentTarget)}
                        >
                          {line.name}
                        </button>
                        {printLabel(line.card) && (
                          <span className="muted text-xs"> · {printLabel(line.card)}</span>
                        )}
                        {!line.card && <span className="muted"> ({t('notFoundCard')})</span>}
                        {line.foil && (
                          <>
                            {' '}
                            <FoilBadge line={line} />
                          </>
                        )}
                      </td>
                      <td className="py-1.5 pe-2">
                        <ManaCost cost={line.card?.manaCost} className="text-sm" />
                      </td>
                      <td className="muted truncate py-1.5 sm:pe-2">
                        {/* No celular a coluna tem largura 0: o tipo fica só no diálogo da carta. */}
                        <span className="hidden sm:inline">{line.card?.typeLine}</span>
                      </td>
                      <td className="py-1.5 text-right">
                        <ProxyBadge line={line} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </section>
      ))}

      <CardDialog
        open={zoomed !== null}
        name={zoomed?.name ?? ''}
        card={zoomed?.card ? { ...zoomed.card, name: zoomed.name } : null}
        back={zoomed ? flipped.has(zoomed.key) : false}
        onBackChange={(back) => {
          if (zoomed && back !== flipped.has(zoomed.key)) toggleFlip(zoomed.key);
        }}
        onClose={() => {
          setZoomed(null);
          opener.current?.focus();
        }}
        badges={
          zoomed && (zoomed.proxies > 0 || zoomed.foil) ? (
            <p className="flex flex-wrap gap-2">
              <ProxyBadge line={zoomed} />
              <FoilBadge line={zoomed} />
            </p>
          ) : null
        }
        price={
          zoomed?.card?.priceUsd && usdBrl ? (
            <p className="text-sm">
              {t('cardPriceBrl', {
                usd: format.number(Number(zoomed.card.priceUsd), {
                  style: 'currency',
                  currency: 'USD',
                }),
                brl: format.number(Number(zoomed.card.priceUsd) * usdBrl, {
                  style: 'currency',
                  currency: 'BRL',
                }),
              })}
            </p>
          ) : undefined
        }
      />
    </section>
  );
}

/** Linha editável: quantidade e proxies salvam ao sair do campo ou com Enter. */
function EditableLine({ deckId, line }: { deckId: string; line: DeckLineView }) {
  const t = useTranslations('decks');
  const { run, error, pending } = useApiAction();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [proxies, setProxies] = useState(String(line.proxies));
  const [foil, setFoil] = useState(Boolean(line.foil));
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState('');
  // Nome com a edição: distingue linhas da mesma carta para leitores de tela.
  const print = printLabel(line.card);
  const label = print ? `${line.name} (${print})` : line.name;

  const save = (q: number, p: number, f: boolean = foil) => {
    if (q === line.quantity && p === line.proxies && f === Boolean(line.foil)) return;
    if (!Number.isInteger(q) || !Number.isInteger(p) || p > q) {
      setStatus(t('invalidCopies'));
      return;
    }
    setStatus('');
    void run(
      () =>
        api(`/api/v1/decks/${deckId}/lines`, {
          method: 'PUT',
          body: {
            name: line.name,
            board: line.board,
            quantity: q,
            proxies: p,
            scryfallId: line.scryfallId,
            foil: f,
          },
        }),
      () =>
        setStatus(
          f !== Boolean(line.foil)
            ? t('foilSaved', { name: line.name, state: f ? 'on' : 'off' })
            : t('lineSaved', { name: line.name }),
        ),
    );
  };
  const commit = () => save(Number(quantity), Number(proxies));
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <tr className="border-t border-ink-200 align-middle dark:border-ink-800">
      <td className="py-1.5 pe-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_COPIES}
          className="input w-full px-2"
          aria-label={t('quantityOf', { name: label })}
          value={quantity}
          disabled={pending}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
        />
      </td>
      <td className="py-1.5 pe-2">
        <span className="block font-medium">{line.name}</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {line.card && <PrintPicker deckId={deckId} line={line} />}
          <label className="inline-flex min-h-8 items-center gap-1.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={foil}
              disabled={pending}
              onChange={(e) => {
                setFoil(e.target.checked);
                save(Number(quantity), Number(proxies), e.target.checked);
              }}
            />
            {t('foil')}
            <span className="sr-only"> ({label})</span>
          </label>
        </div>
        {/* Região viva sempre presente, para o leitor de tela anunciar o resultado. */}
        <span
          role="status"
          className={`block text-xs ${error ? 'text-red-600 dark:text-red-400' : 'muted'}`}
        >
          {error ?? status}
        </span>
      </td>
      <td className="py-1.5 pe-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={Number(quantity) || 0}
          className="input w-full px-2"
          aria-label={t('proxiesOf', { name: label })}
          value={proxies}
          disabled={pending}
          onChange={(e) => setProxies(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
        />
      </td>
      <td className="py-1.5 text-right">
        <button
          type="button"
          className={
            confirming ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'
          }
          disabled={pending}
          onBlur={() => setConfirming(false)}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            setConfirming(false);
            save(0, 0);
          }}
        >
          <Icon name="delete" />
          <span className="hidden sm:inline">
            {confirming ? t('confirmRemoveCard') : t('removeCard')}
          </span>
          <span className="sr-only sm:hidden">
            {confirming ? t('confirmRemoveCard') : t('removeCard')}
          </span>
          <span className="sr-only"> ({label})</span>
        </button>
      </td>
    </tr>
  );
}

/** Adicionar carta: busca com autocompletar do Scryfall, board e quantidade (soma ao que já há). */
function AddCardForm({ deckId, lines }: { deckId: string; lines: DeckLineView[] }) {
  const t = useTranslations('decks');
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [board, setBoard] = useState<DeckBoard>('mainboard');
  const [quantity, setQuantity] = useState('1');
  const [proxy, setProxy] = useState(false);
  const [status, setStatus] = useState('');
  const id = useId();

  return (
    <form
      className="grid gap-3 rounded-xl bg-ink-50 p-4 sm:grid-cols-[2fr_1fr_6rem] lg:grid-cols-[2fr_1fr_6rem_auto_auto] lg:items-end dark:bg-ink-800/60"
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        const add = Number(quantity);
        if (!name.trim() || !Number.isInteger(add) || add < 1) return;
        const existing = lines.find(
          (l) => l.board === board && l.name.toLowerCase() === name.trim().toLowerCase(),
        );
        setStatus('');
        void run(
          () =>
            api<{ found: boolean; line: { name: string } }>(`/api/v1/decks/${deckId}/lines`, {
              method: 'PUT',
              body: {
                name: name.trim(),
                board,
                quantity: (existing?.quantity ?? 0) + add,
                proxies: (existing?.proxies ?? 0) + (proxy ? add : 0),
                // Soma na edição que já está no deck (a primeira, se houver várias).
                ...(existing ? { scryfallId: existing.scryfallId } : {}),
              },
            }),
          (result) => {
            setStatus(
              result.found
                ? t('cardAdded', { name: result.line.name })
                : t('cardAddedNotFound', { name: result.line.name }),
            );
            setName('');
            setQuantity('1');
            setProxy(false);
          },
        );
      }}
    >
      <h3 id={`${id}-title`} className="font-semibold sm:col-span-3 lg:col-span-5">
        {t('addCard')}
      </h3>
      <CardSearch id={`${id}-name`} label={t('cardName')} value={name} onChange={setName} />
      <div>
        <label className="label" htmlFor={`${id}-board`}>
          {t('board')}
        </label>
        <select
          id={`${id}-board`}
          className="select"
          value={board}
          onChange={(e) => setBoard(e.target.value as DeckBoard)}
        >
          {DECK_BOARDS.map((b) => (
            <option key={b} value={b}>
              {t(`boards.${b}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${id}-qty`}>
          {t('copies')}
        </label>
        <input
          id={`${id}-qty`}
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_COPIES}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" checked={proxy} onChange={(e) => setProxy(e.target.checked)} />
        {t('addAsProxy')}
      </label>
      <button className="btn-primary" disabled={pending || !name.trim()}>
        <Icon name="add" />
        {t('addCard')}
      </button>
      <div className="sm:col-span-3 lg:col-span-5" aria-live="polite">
        {status && !error && <p className="muted text-sm">{status}</p>}
        <FormError message={error} />
      </div>
    </form>
  );
}
