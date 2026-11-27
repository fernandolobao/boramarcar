'use client';

import {
  buildLibrary,
  drawNext,
  drawOpening,
  londonMulligan,
  OPENING_HAND_SIZE,
  type DeckBoard,
  type HandState,
} from '@boramarcar/core';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons';
import { useLightDismiss } from './use-light-dismiss';

export interface OpeningHandLine {
  name: string;
  board: DeckBoard;
  quantity: number;
  isLand: boolean;
  imageUri: string | null;
}

/**
 * Testar a mão inicial (11.3): compra 7 do deck principal, mulligan de Londres (compra 7 de novo e
 * escolhe uma carta por mulligan para o fundo) e comprar as próximas. As chances de terrenos ficam
 * no bloco "Mão inicial" da análise.
 */
export function OpeningHand({ lines }: { lines: OpeningHandLine[] }) {
  const t = useTranslations('decks.hand');
  const library = useMemo(() => buildLibrary(lines), [lines]);
  const [state, setState] = useState<HandState | null>(null);
  const [mulligans, setMulligans] = useState(0);
  /** Cartas escolhidas para o fundo, enquanto o mulligan não termina. */
  const [bottom, setBottom] = useState<string[] | null>(null);
  /** Carta ampliada (para ler o texto) e o botão que a abriu (o foco volta para ele). */
  const [zoom, setZoom] = useState<{ name: string; imageUri: string | null } | null>(null);
  const zoomOpener = useRef<HTMLElement | null>(null);
  const openZoom = (card: { name: string; imageUri: string | null }, el: HTMLElement) => {
    zoomOpener.current = el;
    setZoom(card);
  };

  if (library.length < OPENING_HAND_SIZE) return <p className="muted">{t('tooSmall')}</p>;

  const fresh = () => {
    setState(drawOpening(library));
    setMulligans(0);
    setBottom(null);
  };
  const mulligan = () => {
    setState(drawOpening(library));
    setMulligans((m) => m + 1);
    setBottom([]);
  };
  const keep = () => {
    if (!state || !bottom) return;
    setState(londonMulligan(state, bottom));
    setBottom(null);
  };
  const lands = state?.hand.filter((c) => c.isLand).length ?? 0;
  const choosing = bottom !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={fresh}>
          <Icon name="openingHand" />
          {state ? t('newHand') : t('draw')}
        </button>
        {state && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={mulligan}
              disabled={mulligans >= OPENING_HAND_SIZE - 1}
            >
              {t('mulligan')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setState(drawNext(state))}
              disabled={choosing || state.library.length === 0}
            >
              {t('drawNext')}
            </button>
          </>
        )}
      </div>

      <p role="status" className="text-sm">
        {state &&
          (choosing
            ? t('chooseBottom', { count: mulligans, chosen: bottom.length })
            : t('summary', { cards: state.hand.length, lands, mulligans }))}
      </p>

      {state && (
        // Cartas grandes o bastante para ler (2 a 4 por linha); tocar amplia.
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.hand.map((card) => {
            const picked = bottom?.includes(card.id) ?? false;
            const face = (
              <span className="relative block aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] bg-surface-muted shadow-sm">
                {card.imageUri ? (
                  <Image
                    src={card.imageUri}
                    alt=""
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 17rem, (min-width: 640px) 30vw, 46vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center p-2 text-center text-sm font-medium">
                    {card.name}
                  </span>
                )}
                {picked && (
                  <span className="absolute inset-x-1 bottom-[6%] rounded-md bg-noite/85 px-1.5 py-0.5 text-center text-xs font-bold text-pergaminho">
                    {t('toBottom')}
                  </span>
                )}
              </span>
            );
            return (
              <li key={card.id} className="relative">
                {choosing ? (
                  <>
                    <button
                      type="button"
                      aria-pressed={picked}
                      className={`block w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${picked ? 'ring-4 ring-primary' : ''}`}
                      onClick={() =>
                        setBottom((b) =>
                          !b
                            ? b
                            : b.includes(card.id)
                              ? b.filter((id) => id !== card.id)
                              : b.length < mulligans
                                ? [...b, card.id]
                                : b,
                        )
                      }
                    >
                      {face}
                      <span className="sr-only">{t('pickBottom', { name: card.name })}</span>
                    </button>
                    {/* Ampliar sem escolher: botão próprio no canto da carta. */}
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={t('zoom', { name: card.name })}
                      title={t('zoom', { name: card.name })}
                      className="absolute top-[4%] right-[5%] inline-flex size-9 items-center justify-center rounded-full bg-noite/80 text-pergaminho hover:bg-noite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      onClick={(e) => openZoom(card, e.currentTarget)}
                    >
                      <Icon name="zoom" className="size-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={t('zoom', { name: card.name })}
                    className="block w-full cursor-zoom-in rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    onClick={(e) => openZoom(card, e.currentTarget)}
                  >
                    {face}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {choosing && (
        <button
          type="button"
          className="btn-primary"
          disabled={bottom.length !== mulligans}
          onClick={keep}
        >
          {t('keep', { count: OPENING_HAND_SIZE - mulligans })}
        </button>
      )}

      <CardZoom
        card={zoom}
        onClose={() => {
          setZoom(null);
          zoomOpener.current?.focus();
        }}
      />
    </div>
  );
}

/** A carta grande, para ler o texto (Esc, "Fechar" ou o fundo fecham). */
function CardZoom({
  card,
  onClose,
}: {
  card: { name: string; imageUri: string | null } | null;
  onClose: () => void;
}) {
  const t = useTranslations('decks.hand');
  const tc = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  useLightDismiss(ref);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (card && !d.open) d.showModal();
    if (!card && d.open) d.close();
  }, [card]);
  return (
    <dialog
      ref={ref}
      aria-label={card?.name ?? t('title')}
      className="m-auto max-h-[96dvh] w-[min(94vw,26rem)] overflow-visible bg-transparent p-0 backdrop:bg-noite/80"
      onClose={onClose}
    >
      {card && (
        <div className="flex flex-col items-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => ref.current?.close()}>
            <Icon name="close" />
            {tc('close')}
          </button>
          {card.imageUri ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem do Scryfall, já em cache
            <img
              src={card.imageUri}
              alt={card.name}
              className="aspect-[488/680] max-h-[85dvh] w-full rounded-[4.5%/3.2%] object-contain shadow-2xl"
            />
          ) : (
            <p className="w-full rounded-2xl bg-surface p-6 text-center text-lg font-semibold text-fg">
              {card.name}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
