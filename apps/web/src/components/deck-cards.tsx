'use client';

import {
  DECK_BOARDS,
  groupEntriesByType,
  MAX_COPIES,
  outsideIdentity,
  type DeckBoard,
} from '@boramarcar/core';
import Image from 'next/image';
import { HoloLayers } from './holo-effects';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { api } from '@/lib/api';
import { CardDialog } from './card-dialog';
import { CardSearch } from './card-search';
import { CardScanButton } from './card-scanner';
import { flipCard } from './card-flip';
import { Icon } from './icons';
import { ManaCost, ManaText } from './mana';
import { printLabel, PrintPicker } from './print-picker';
import { FormError, useApiAction } from './use-api-action';
import { NumberField } from './ds/number-field';
import { Select } from '@/components/ds/select';
import { Checkbox } from '@/components/ds/checkbox';

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
    /** Identidade de cor (para o aviso de fora da identidade do comandante). */
    colorIdentity?: string[];
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
  inCollection = {},
  identity = null,
  commanderLabel = '',
  canScan = false,
}: {
  deckId: string;
  lines: DeckLineView[];
  /** Leitura pela câmera liberada (flag `card-scanner`). */
  canScan?: boolean;
  isOwner: boolean;
  /**
   * Identidade de cor do comandante (formatos com comandante): carta do deck com cores fora dela
   * ganha o aviso "Fora da identidade" com as cores (11.5). `null` = sem comandante.
   */
  identity?: readonly string[] | null;
  /** Nome(s) do comandante, para o aviso e o filtro da busca. */
  commanderLabel?: string;
  /** Rascunho: cópias livres na coleção por carta (nome em minúsculas), em qualquer edição. */
  inCollection?: Record<string, number>;
  /** Cotação do dólar para mostrar o preço da carta também em reais. */
  usdBrl?: number | null;
}) {
  const t = useTranslations('decks');
  const format = useFormatter();
  const [view, setView] = useState<View>('visual');
  const [zoomed, setZoomed] = useState<DeckTile | null>(null);
  const tiles = lines.flatMap(tilesOf);
  /** Cores fora da identidade do comandante (só no deck principal e na reserva). */
  const outsideOf = (line: DeckLineView) =>
    identity && line.card && (line.board === 'mainboard' || line.board === 'sideboard')
      ? outsideIdentity(line.card.colorIdentity ?? [], identity)
      : [];
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

      {isOwner && (
        <AddCardForm
          deckId={deckId}
          identity={identity}
          commanderLabel={commanderLabel}
          canScan={canScan}
          lines={lines}
        />
      )}

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
                    {/* Rascunho: você já tem cópias livres desta carta na coleção (canto livre). */}
                    {inCollection[line.name.toLowerCase()] && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-1.5 bottom-[6%] inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-1.5 py-0.5 text-xs font-bold text-fg"
                      >
                        <Icon name="collection" className="size-3.5 shrink-0" />
                        {inCollection[line.name.toLowerCase()]}
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
                    {inCollection[line.name.toLowerCase()] && (
                      <span className="sr-only">
                        {' '}
                        (
                        {t('draft.inCollection', { count: inCollection[line.name.toLowerCase()]! })}
                        )
                      </span>
                    )}
                  </p>
                  <OutsideIdentity colors={outsideOf(line)} />
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
                      <OutsideIdentity colors={outsideOf(line)} />
                      {inCollection[line.name.toLowerCase()] && (
                        <span className="muted text-xs">
                          {' '}
                          ·{' '}
                          {t('draft.inCollection', {
                            count: inCollection[line.name.toLowerCase()]!,
                          })}
                        </span>
                      )}
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
/** Espera depois da última mudança nos números antes de gravar (junta os toques no −/+). */
const SAVE_DELAY_MS = 700;

function LineEditor({ deckId, tile }: { deckId: string; tile: DeckTile }) {
  const t = useTranslations('decks');
  const { run, error, pending } = useApiAction();
  const id = useId();
  const group = tile.group;
  const isFoil = tile.finish === 'foil';
  const groupFoils = foilsOf(group);
  const [quantity, setQuantity] = useState<number | null>(tile.quantity);
  const [proxies, setProxies] = useState<number | null>(tile.proxies);
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
  /** Salva ao mudar um dos números (sair do campo, Enter ou −/+), com os valores novos. */
  const commit = (next: { quantity: number | null; proxies: number | null }) => {
    const n = next.quantity;
    const px = isFoil ? 0 : next.proxies;
    if (n === null || px === null || px > n) {
      setStatus(t('invalidCopies'));
      return;
    }
    setThis(
      n,
      px,
      n === 0 ? t('cardRemoved', { name: tile.name }) : t('lineSaved', { name: tile.name }),
    );
  };
  /**
   * Os números gravam 0,7 s depois da última mudança: vários toques no −/+ viram uma gravação
   * só, e os campos não travam esperando o servidor. Fechar a carta antes disso grava na hora.
   */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<{ quantity: number | null; proxies: number | null } | null>(null);
  const flush = useRef(() => {});
  // A gravação usa a versão mais recente de `commit` (com os valores da linha atualizados).
  useLayoutEffect(() => {
    flush.current = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const next = queued.current;
      queued.current = null;
      if (next) commit(next);
    };
  });
  const schedule = (next: { quantity: number | null; proxies: number | null }) => {
    queued.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush.current(), SAVE_DELAY_MS);
  };
  useEffect(() => () => flush.current(), []);
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
        <div>
          <NumberField
            id={`${id}-q`}
            label={t('quantityLabel')}
            value={quantity}
            min={0}
            max={MAX_COPIES}
            onChange={(v) => {
              setQuantity(v);
              schedule({ quantity: v, proxies });
            }}
          />
        </div>
        {!isFoil && (
          <div>
            <NumberField
              id={`${id}-p`}
              label={t('proxiesLabel')}
              value={proxies}
              min={0}
              max={quantity ?? 0}
              onChange={(v) => {
                setProxies(v);
                schedule({ quantity, proxies: v });
              }}
            />
          </div>
        )}
        <Checkbox
          label={t('foil')}
          checked={isFoil}
          disabled={pending || real < 1}
          onChange={() => moveFinish(real)}
          className="font-medium"
        >
          <span aria-hidden="true">✦</span>
        </Checkbox>
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
function AddCardForm({
  deckId,
  identity = null,
  commanderLabel = '',
  canScan = false,
  lines = [],
}: {
  deckId: string;
  identity?: readonly string[] | null;
  commanderLabel?: string;
  canScan?: boolean;
  /** Linhas atuais do deck: a leitura soma às cópias que já existem na mesma edição. */
  lines?: DeckLineView[];
}) {
  const ts = useTranslations('scan');
  const router = useRouter();
  const t = useTranslations('decks');
  const ti = useTranslations('analysis.identity');
  const { run, error, pending } = useApiAction();
  const [name, setName] = useState('');
  const [board, setBoard] = useState<DeckBoard>('mainboard');
  const [quantity, setQuantity] = useState<number | null>(1);
  const [proxy, setProxy] = useState(false);
  const [status, setStatus] = useState('');
  /** Busca só cartas da identidade do comandante (11.5); ligado por padrão. */
  const [onlyIdentity, setOnlyIdentity] = useState(true);
  /** Carta escolhida fora da identidade: as cores que quebram a regra. */
  const [warning, setWarning] = useState<{ name: string; colors: string[] } | null>(null);
  const id = useId();
  const playing = board === 'mainboard' || board === 'sideboard';

  /** Cores fora da identidade da carta com esse nome (vazio = cabe, ou não deu para saber). */
  const checkIdentity = async (cardName: string) => {
    if (!identity) return [];
    try {
      const { card } = await api<{ card: { colorIdentity?: string[] } | null }>(
        `/api/v1/cards/named?${new URLSearchParams({ name: cardName })}`,
      );
      return card ? outsideIdentity(card.colorIdentity ?? [], identity) : [];
    } catch {
      return [];
    }
  };

  const add = (target: DeckBoard) => {
    const copies = quantity ?? 0;
    if (!name.trim() || copies < 1) return;
    setStatus('');
    void run(
      () =>
        // Cópias novas entram na edição padrão (pilha própria), não numa edição já trocada.
        api<{ found: boolean; line: { name: string } }>(`/api/v1/decks/${deckId}/lines`, {
          method: 'POST',
          body: { name: name.trim(), board: target, quantity: copies, proxies: proxy ? copies : 0 },
        }),
      (result) => {
        setStatus(
          result.found
            ? t('cardAdded', { name: result.line.name })
            : t('cardAddedNotFound', { name: result.line.name }),
        );
        setName('');
        setQuantity(1);
        setProxy(false);
        setWarning(null);
      },
    );
  };

  return (
    <form
      className="grid gap-3 rounded-xl bg-ink-50 p-4 sm:grid-cols-[2fr_1fr_auto] lg:grid-cols-[2fr_1fr_auto_auto_auto] lg:items-end dark:bg-ink-800/60"
      aria-labelledby={`${id}-title`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        // Antes de pôr no deck uma carta fora da identidade, avisa uma vez (11.5).
        if (identity && playing && warning?.name !== name.trim()) {
          const colors = await checkIdentity(name.trim());
          if (colors.length) return setWarning({ name: name.trim(), colors });
        }
        add(board);
      }}
    >
      <h3 id={`${id}-title`} className="font-semibold sm:col-span-3 lg:col-span-5">
        {t('addCard')}
      </h3>
      {canScan && (
        <div className="sm:col-span-3 lg:col-span-5">
          <CardScanButton
            onAdd={async (cards) => {
              // Soma às cópias que já existem da mesma carta, edição e board (a linha é gravada
              // inteira: total, proxies e foils).
              const current = new Map<
                string,
                { quantity: number; proxies: number; foils: number }
              >();
              for (const l of lines) {
                if (l.board !== board) continue;
                const k = `${l.name.toLowerCase()}|${l.scryfallId ?? ''}`;
                const c = current.get(k) ?? { quantity: 0, proxies: 0, foils: 0 };
                current.set(k, {
                  quantity: c.quantity + l.quantity,
                  proxies: c.proxies + l.proxies,
                  foils: c.foils + (l.foils ?? (l.foil ? l.quantity - l.proxies : 0)),
                });
              }
              for (const card of cards) {
                const k = `${card.name.toLowerCase()}|${card.scryfallId}`;
                const c = current.get(k) ?? { quantity: 0, proxies: 0, foils: 0 };
                const next = {
                  quantity: c.quantity + 1,
                  proxies: c.proxies,
                  foils: c.foils + (card.foil ? 1 : 0),
                };
                await api(`/api/v1/decks/${deckId}/lines`, {
                  method: 'PUT',
                  body: { name: card.name, board, scryfallId: card.scryfallId, ...next },
                });
                current.set(k, next);
              }
              setStatus(ts('added', { count: cards.length }));
              router.refresh();
            }}
          />
        </div>
      )}
      {/* Antes da busca: o filtro muda as sugestões (ordem de leitura e de foco). */}
      {identity && (
        <div className="sm:col-span-3 lg:col-span-5">
          <Checkbox
            label={ti('onlyIdentity', { commander: commanderLabel })}
            checked={onlyIdentity}
            onChange={setOnlyIdentity}
          />
        </div>
      )}
      <CardSearch
        id={`${id}-name`}
        label={t('cardName')}
        value={name}
        onChange={(v) => {
          setName(v);
          if (warning && v.trim() !== warning.name) setWarning(null);
        }}
        onPick={(picked) => {
          if (!identity || !playing) return;
          void checkIdentity(picked).then((colors) =>
            setWarning(colors.length ? { name: picked, colors } : null),
          );
        }}
        identity={identity && onlyIdentity ? identity.join('') || 'C' : undefined}
      />
      <div>
        <Select
          label={t('board')}
          id={`${id}-board`}
          value={String(board)}
          onChange={(v) => setBoard(v as DeckBoard)}
          options={[...DECK_BOARDS.map((b) => ({ value: String(b), label: t(`boards.${b}`) }))]}
        />
      </div>
      <div>
        <NumberField
          id={`${id}-qty`}
          label={t('copies')}
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={MAX_COPIES}
        />
      </div>
      <Checkbox label={t('addAsProxy')} checked={proxy} onChange={setProxy} />
      <button className="btn-primary" disabled={pending || !name.trim()}>
        <Icon name="add" />
        {warning && playing ? ti('addAnyway') : t('addCard')}
      </button>
      <div className="space-y-2 sm:col-span-3 lg:col-span-5" aria-live="polite">
        {warning && playing && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-strong bg-surface p-3 text-sm">
            <Icon name="warning" className="size-4 shrink-0 text-danger" />
            <span>
              {ti.rich('warning', {
                card: warning.name,
                commander: commanderLabel,
                identity: () => (
                  <ManaText text={identity!.map((c) => `{${c}}`).join('') || '{C}'} />
                ),
                colors: () => <ManaText text={warning.colors.map((c) => `{${c}}`).join('')} />,
              })}
            </span>
            <button
              type="button"
              className="btn-secondary min-h-9 px-3 text-xs"
              disabled={pending}
              onClick={() => add('maybeboard')}
            >
              {ti('addToMaybe')}
            </button>
          </div>
        )}
        {status && !error && <p className="muted text-sm">{status}</p>}
        <FormError message={error} />
      </div>
    </form>
  );
}

/**
 * Aviso de carta fora da identidade de cor do comandante (11.5): ícone, texto e as cores que
 * quebram a regra (símbolos com o nome por extenso), sem depender só da cor.
 */
function OutsideIdentity({ colors }: { colors: readonly string[] }) {
  const t = useTranslations('analysis.identity');
  if (!colors.length) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-danger">
      <Icon name="warning" className="size-3.5 shrink-0" />
      {t('badge')}
      <ManaText text={colors.map((c) => `{${c}}`).join('')} />
    </span>
  );
}
