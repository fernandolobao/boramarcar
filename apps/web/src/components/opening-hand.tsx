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
import { useMemo, useState } from 'react';
import { Icon } from './icons';

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
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
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
                    sizes="(min-width: 768px) 14vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center p-2 text-center text-xs font-medium">
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
              <li key={card.id}>
                {choosing ? (
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
                ) : (
                  <figure>
                    {face}
                    <figcaption className="sr-only">{card.name}</figcaption>
                  </figure>
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
    </div>
  );
}
