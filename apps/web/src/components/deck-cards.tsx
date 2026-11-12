'use client';

import { DECK_BOARDS, groupEntriesByType, MAX_COPIES, type DeckBoard } from '@boramarcar/core';
import Image from 'next/image';
import { HoloLayers } from './holo-effects';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { api } from '@/lib/api';
import { CardDialog } from './card-dialog';
import { CardSearch } from './card-search';
import { flipCard } from './card-flip';
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
  /** Todas as cópias reais são foil. */
  foil?: boolean;
  /** Quantas cópias reais são foil (foil e comum da mesma edição convivem). */
  foils?: number;
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

type View = 'visual' | 'list';

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

/** Cópias foil da linha (linhas antigas sem `foils`: todas as reais se `foil`). */
export const foilsOf = (line: Pick<DeckLineView, 'foil' | 'foils' | 'quantity' | 'proxies'>) =>
  line.foils ?? (line.foil ? line.quantity - line.proxies : 0);

/** Uma carta na grade/lista: as cópias comuns e as foil da mesma edição são cartas separadas. */
export interface DeckTile extends DeckLineView {
  finish: 'normal' | 'foil';
  /** A linha inteira (carta + edição), com todas as cópias comuns, foil e proxies. */
  group: DeckLineView;
}

/** Separa a linha em carta comum (com as proxies) e carta foil, quando há as duas. */
export function tilesOf(line: DeckLineView): DeckTile[] {
  const foils = foilsOf(line);
  const normal = line.quantity - foils;
  const tiles: DeckTile[] = [];
  if (normal > 0) {
    tiles.push({ ...line, quantity: normal, foils: 0, foil: false, finish: 'normal', group: line });
  }
  if (foils > 0) {
    tiles.push({
      ...line,
      key: normal > 0 ? `${line.key}|foil` : line.key,
      quantity: foils,
      proxies: 0,
      foils,
      foil: true,
      finish: 'foil',
      group: line,
    });
  }
  return tiles;
}

/** Selo de foil: "Foil" quando todas as cópias reais são foil; senão "1 foil" (texto + ✦). */
function FoilBadge({ line }: { line: DeckLineView }) {
  const t = useTranslations('decks');
  const foils = foilsOf(line);
  if (!foils) return null;
  return (
    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-teal-900 dark:bg-teal-900 dark:text-teal-100">
      <span aria-hidden="true">✦ </span>
      {foils === line.quantity - line.proxies ? t('foil') : t('foilCount', { count: foils })}
    </span>
  );
}

/**
 * Cartas do deck: **visual** (imagens por tipo) e **lista**. Tocar numa carta abre o diálogo da
 * carta; para o dono, o mesmo diálogo edita a linha (quantidade, proxies, foil, edição, remover).
 * O dono também adiciona cartas com a busca do Scryfall.
 */

/**
 * Ritmo do brilho foil de cada carta, derivado da chave (estável entre servidor e cliente):
 * duração, fase e "respiração" diferentes, para cartas vizinhas não brilharem em sincronia.
 */
export function foilTiming(key: string): CSSProperties {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  const unit = (shift: number) => ((h >>> shift) & 0xff) / 255;
  const dur = 9 + unit(0) * 6; // 9–15s por volta
  return {
    '--foil-dur': `${dur.toFixed(2)}s`,
    '--foil-delay': `-${(unit(8) * dur).toFixed(2)}s`,
    '--foil-breath': `${(5 + unit(16) * 4).toFixed(2)}s`,
  } as CSSProperties;
}

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
  const [zoomed, setZoomed] = useState<DeckTile | null>(null);
  const tiles = lines.flatMap(tilesOf);
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

  const views: View[] = ['visual', 'list'];
  // A linha aberta no diálogo, sempre com os dados mais novos (o editor atualiza a página).
  // Se a carta mudou de acabamento (ex.: virou foil), segue para a outra carta da mesma linha.
  const current = zoomed
    ? (tiles.find((l) => l.key === zoomed.key) ??
      tiles.find((l) => l.group.key === zoomed.group.key) ??
      null)
    : null;
  type Group = { key: string; title: string; count: number; lines: DeckTile[] };
  const groups = DECK_BOARDS.flatMap((board): Group[] => {
    const own = tiles.filter((l) => l.board === board);
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

  const openZoom = (line: DeckTile, button: HTMLButtonElement) => {
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
              <Icon name={v === 'visual' ? 'gallery' : 'list'} />
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
      </div>

      {isOwner && <AddCardForm deckId={deckId} />}

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
                      className={`relative block aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] bg-ink-200 shadow-sm ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-ink-800 ${
                        foilsOf(line) > 0 && imageOf(line) ? 'holo' : ''
                      }`}
                      aria-label={t(isOwner ? 'zoomEdit' : 'zoom', { name: line.name })}
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
                          {foilsOf(line) > 0 && (
                            <span
                              aria-hidden="true"
                              className="foil-sheen"
                              style={foilTiming(line.key)}
                            />
                          )}
                          {/* Foil: inclina e brilha com o mouse ou com o celular. */}
                          {foilsOf(line) > 0 && <HoloLayers foil />}
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
                        onClick={(e) => {
                          const toBack = !flipped.has(line.key);
                          // O botão da carta vem logo antes deste.
                          flipCard(
                            e.currentTarget.previousElementSibling as HTMLElement | null,
                            () => toggleFlip(line.key),
                            {
                              toBack,
                              preload: toBack ? line.card?.backImageUri : line.card?.imageUri,
                            },
                          );
                        }}
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
                    {foilsOf(line) > 0 && (
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
                    {foilsOf(line) > 0 && <span className="sr-only"> ({t('foil')})</span>}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            // table-fixed + <colgroup>: cada grupo é uma tabela, e as larguras fixas deixam as
            // colunas alinhadas entre todos os grupos.
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-28 sm:w-40" />
                <col className="w-0 sm:w-[30%]" />
                <col className="w-20 sm:w-24" />
              </colgroup>
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t('quantityHeader')}</th>
                  <th scope="col">{t('cardName')}</th>
                  <th scope="col">{t('manaCost')}</th>
                  <th scope="col">{t('type')}</th>
                  <th scope="col">{t('proxy')}</th>
                </tr>
              </thead>
              <tbody>
                {group.lines.map((line) => (
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
                        {isOwner && <span className="sr-only"> ({t('editHint')})</span>}
                      </button>
                      {printLabel(line.card) && (
                        <span className="muted text-xs"> · {printLabel(line.card)}</span>
                      )}
                      {!line.card && <span className="muted"> ({t('notFoundCard')})</span>}
                      {foilsOf(line) > 0 && (
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
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      <CardDialog
        open={zoomed !== null && current !== null}
        name={current?.name ?? ''}
        card={current?.card ? { ...current.card, name: current.name } : null}
        back={current ? flipped.has(current.key) : false}
        foil={current ? foilsOf(current) > 0 : false}
        onBackChange={(back) => {
          if (current && back !== flipped.has(current.key)) toggleFlip(current.key);
        }}
        onClose={() => {
          setZoomed(null);
          opener.current?.focus();
        }}
        badges={
          current && (current.proxies > 0 || foilsOf(current) > 0) ? (
            <p className="flex flex-wrap gap-2">
              <ProxyBadge line={current} />
              <FoilBadge line={current} />
            </p>
          ) : null
        }
        price={
          current?.card?.priceUsd && usdBrl ? (
            <p className="text-sm">
              {t('cardPriceBrl', {
                usd: format.number(Number(current.card.priceUsd), {
                  style: 'currency',
                  currency: 'USD',
                }),
                brl: format.number(Number(current.card.priceUsd) * usdBrl, {
                  style: 'currency',
                  currency: 'BRL',
                }),
              })}
            </p>
          ) : undefined
        }
      >
        {isOwner && current && <LineEditor key={current.key} deckId={deckId} tile={current} />}
      </CardDialog>
    </section>
  );
}

/**
 * Editor da carta no diálogo (dono do deck). Cada carta da grade é uma versão: as cópias comuns
 * (com as proxies) ou as foil da mesma edição. Quantidade e proxies salvam ao sair do campo ou
 * com Enter; "Foil" passa as cópias desta carta para o outro acabamento; "Separar 1 cópia" cria
 * a outra carta com uma cópia; a edição troca pelo seletor; remover pede confirmação.
 */
function LineEditor({ deckId, tile }: { deckId: string; tile: DeckTile }) {
  const t = useTranslations('decks');
  const { run, error, pending } = useApiAction();
  const id = useId();
  const group = tile.group;
  const isFoil = tile.finish === 'foil';
  const groupFoils = foilsOf(group);
  const [quantity, setQuantity] = useState(String(tile.quantity));
  const [proxies, setProxies] = useState(String(tile.proxies));
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState('');
  const real = tile.quantity - tile.proxies;

  /** Grava a linha inteira (carta + edição): total, proxies e quantas são foil. */
  const save = (q: number, p: number, f: number, message: string) => {
    if (q === group.quantity && p === group.proxies && f === groupFoils) return;
    if (![q, p, f].every(Number.isInteger) || p > q || f < 0 || f > q - p) {
      setStatus(t('invalidCopies'));
      return;
    }
    setStatus('');
    void run(
      () =>
        api(`/api/v1/decks/${deckId}/lines`, {
          method: 'PUT',
          body: {
            name: group.name,
            board: group.board,
            quantity: q,
            proxies: p,
            scryfallId: group.scryfallId,
            foils: f,
          },
        }),
      () => setStatus(message),
    );
  };
  /** Esta carta com `n` cópias (e `px` proxies, só na carta comum); a outra fica como está. */
  const setThis = (n: number, px: number, message: string) =>
    isFoil
      ? save(group.quantity - groupFoils + n, group.proxies, n, message)
      : save(n + groupFoils, px, groupFoils, message);
  const commit = () => {
    const n = Number(quantity);
    const px = isFoil ? 0 : Number(proxies);
    if (!Number.isInteger(n) || !Number.isInteger(px) || px > n) {
      setStatus(t('invalidCopies'));
      return;
    }
    setThis(
      n,
      px,
      n === 0 ? t('cardRemoved', { name: tile.name }) : t('lineSaved', { name: tile.name }),
    );
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };
  /** Passa `n` cópias reais desta carta para o outro acabamento. */
  const moveFinish = (n: number) => {
    const f = isFoil ? groupFoils - n : groupFoils + n;
    save(group.quantity, group.proxies, f, t('foilsSaved', { name: tile.name, count: f }));
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-line px-3 pt-1 pb-3">
      <legend className="px-1 text-sm font-semibold">
        {isFoil ? t('editLineFoil') : t('editLine')}
      </legend>
      {/* Linha 1: as cópias (quantidade, proxies e acabamento). Linha 2: as ações. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="w-24">
          <label className="label" htmlFor={`${id}-q`}>
            {t('quantityLabel')}
          </label>
          <input
            id={`${id}-q`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_COPIES}
            className="input"
            value={quantity}
            disabled={pending}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
          />
        </div>
        {!isFoil && (
          <div className="w-28">
            <label className="label" htmlFor={`${id}-p`}>
              {t('proxiesLabel')}
            </label>
            <input
              id={`${id}-p`}
              type="number"
              inputMode="numeric"
              min={0}
              max={Number(quantity) || 0}
              className="input"
              value={proxies}
              disabled={pending}
              onChange={(e) => setProxies(e.target.value)}
              onBlur={commit}
              onKeyDown={onKey}
            />
          </div>
        )}
        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isFoil}
            disabled={pending || real < 1}
            onChange={() => moveFinish(real)}
          />
          <span aria-hidden="true">✦</span> {t('foil')}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tile.card && <PrintPicker deckId={deckId} line={{ ...tile, foil: isFoil }} />}
        {real >= 2 && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => moveFinish(1)}
          >
            <Icon name="flip" />
            {isFoil ? t('splitNormal') : t('splitFoil')}
          </button>
        )}
        <button
          type="button"
          className={`${confirming ? 'btn-danger border border-danger' : 'btn-danger'} ms-auto`}
          disabled={pending}
          onBlur={() => setConfirming(false)}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            setConfirming(false);
            setThis(0, 0, t('cardRemoved', { name: tile.name }));
          }}
        >
          <Icon name="delete" />
          {confirming ? t('confirmRemoveFromDeck') : t('removeFromDeck')}
        </button>
      </div>
      {tile.card && tile.quantity > 1 && <p className="muted text-xs">{t('printSplitHint')}</p>}
      {/* Região viva sempre presente, para o leitor de tela anunciar o resultado. */}
      <p role="status" className={`text-sm ${error ? 'text-danger' : 'muted'}`}>
        {error ?? status}
      </p>
    </fieldset>
  );
}

/**
 * Adicionar carta: busca com autocompletar do Scryfall, board e quantidade. As cópias entram na
 * edição padrão e somam só com a pilha dessa edição.
 */
function AddCardForm({ deckId }: { deckId: string }) {
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
        setStatus('');
        void run(
          () =>
            // Cópias novas entram na edição padrão (pilha própria), não numa edição já trocada.
            api<{ found: boolean; line: { name: string } }>(`/api/v1/decks/${deckId}/lines`, {
              method: 'POST',
              body: { name: name.trim(), board, quantity: add, proxies: proxy ? add : 0 },
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
