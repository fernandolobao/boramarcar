'use client';

import { ligaMagicCardUrl } from '@boramarcar/core';
import Image from 'next/image';
import { HoloLayers } from './holo-effects';
import { useFormatter, useTranslations } from 'next-intl';
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { Icon } from './icons';
import { ManaCost } from './mana';
import { printLabel } from './print-picker';

/** O que o diálogo precisa saber de uma carta (os campos vêm do cache do Scryfall). */
export interface DialogCard {
  name: string;
  typeLine: string;
  manaCost?: string | null;
  imageUri?: string | null;
  backImageUri?: string | null;
  backName?: string | null;
  setCode?: string | null;
  setName?: string | null;
  collectorNumber?: string | null;
  priceUsd?: string | null;
}

/**
 * Diálogo da carta (o mesmo do deck): imagem grande, frente e verso, tipo, custo, edição, preço
 * e link para a LigaMagic. Esc fecha e o foco volta para quem abriu.
 */
export function CardDialog({
  open,
  name,
  card,
  status = 'ready',
  back = false,
  onBackChange,
  onClose,
  badges,
  price,
  children,
  foil = false,
}: {
  open: boolean;
  name: string;
  card: DialogCard | null;
  status?: 'loading' | 'ready' | 'missing' | 'error';
  /** Mostrando o verso (cartas de duas faces). */
  back?: boolean;
  onBackChange?: (back: boolean) => void;
  onClose: () => void;
  /** Selos extras (proxy, foil…). */
  badges?: ReactNode;
  /** Preço já formatado (ex.: com reais); sem valor, mostra o preço em dólar da carta. */
  price?: ReactNode;
  /** Conteúdo extra no fim (ex.: o editor da linha do deck, para o dono). */
  children?: ReactNode;
  /** Carta foil: brilho na imagem (decorativo). */
  foil?: boolean;
}) {
  const t = useTranslations('decks');
  const tc = useTranslations('common');
  const format = useFormatter();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const image = back && card?.backImageUri ? card.backImageUri : card?.imageUri;
  const alt = back && card?.backName ? card.backName : (card?.name ?? name);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto max-h-[94dvh] w-[min(96vw,52rem)] overflow-y-auto rounded-2xl bg-surface p-3 text-fg shadow-2xl backdrop:bg-noite/70 sm:p-5"
      onClose={onClose}
    >
      {open && (
        // Carta à esquerda, informações e edição à direita (também no celular, com a carta
        // menor), para editar sem rolar.
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-3 sm:gap-6">
          <div className="space-y-2">
            {status === 'ready' &&
              (image ? (
                <div className="holo relative aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] shadow-md">
                  <Image
                    src={image}
                    alt={alt}
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 20rem, 40vw"
                    className="object-cover"
                  />
                  {foil && <span aria-hidden="true" className="foil-sheen" />}
                  <HoloLayers foil={foil} />
                </div>
              ) : (
                <p className="muted grid aspect-[488/680] w-full place-items-center rounded-[4.5%/3.2%] bg-surface-muted p-2 text-center text-sm">
                  {t('noImage')}
                </p>
              ))}
            {card?.backImageUri && (
              <div role="group" aria-label={t('faces')} className="flex flex-wrap gap-2">
                {(['front', 'back'] as const).map((face) => {
                  const pressed = face === 'back' ? back : !back;
                  return (
                    <button
                      key={face}
                      type="button"
                      className={`${pressed ? 'btn-primary' : 'btn-secondary'} flex-1 px-2 text-sm`}
                      aria-pressed={pressed}
                      onClick={() => onBackChange?.(face === 'back')}
                    >
                      {t(face === 'front' ? 'faceFront' : 'faceBack')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 id={titleId} className="text-lg leading-tight font-semibold">
                {card?.name ?? name}
              </h2>
              <button
                type="button"
                className="btn-secondary shrink-0 px-2 sm:px-3"
                onClick={() => ref.current?.close()}
              >
                <Icon name="close" />
                <span className="sr-only sm:not-sr-only">{t('close')}</span>
              </button>
            </div>
            {status === 'loading' && (
              <p role="status" className="muted">
                {t('cardLoading')}
              </p>
            )}
            {(status === 'missing' || status === 'error') && (
              <p role="alert" className="muted">
                {status === 'missing' ? t('cardMissing') : t('cardError')}
              </p>
            )}
            {card && (
              <p className="muted flex flex-wrap items-center gap-2 text-sm">
                {card.typeLine}
                <ManaCost cost={card.manaCost} />
              </p>
            )}
            {card?.setName && (
              <p className="text-sm">
                {t('printOf', { set: card.setName, print: printLabel(card) ?? '' })}
              </p>
            )}
            {badges}
            {price ??
              (card?.priceUsd && (
                <p className="text-sm">
                  {t('cardPrice', {
                    usd: format.number(Number(card.priceUsd), {
                      style: 'currency',
                      currency: 'USD',
                    }),
                  })}
                </p>
              ))}
            <a
              href={ligaMagicCardUrl(card?.name ?? name)}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full text-sm"
            >
              <Icon name="externalLink" />
              {t('ligaMagic')}
              <span className="sr-only"> {tc('newTab')}</span>
            </a>
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * Nome de carta que abre a carta (busca pelo nome na primeira vez). Use onde só o nome aparece
 * escrito (análise, validação, comparação, estatísticas…).
 */
export function CardName({ name, className = '' }: { name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [back, setBack] = useState(false);
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'missing' | 'error';
    card: DialogCard | null;
  } | null>(null);
  const opener = useRef<HTMLButtonElement>(null);

  const show = () => {
    setOpen(true);
    setBack(false);
    if (state?.status === 'ready' || state?.status === 'missing') return;
    setState({ status: 'loading', card: null });
    api<{ card: DialogCard | null }>(`/api/v1/cards/named?${new URLSearchParams({ name })}`)
      .then(({ card }) => setState({ status: card ? 'ready' : 'missing', card }))
      .catch(() => setState({ status: 'error', card: null }));
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-haspopup="dialog"
        onClick={show}
        className={`cursor-pointer rounded-sm text-left underline decoration-fg-muted/60 decoration-dotted decoration-1 underline-offset-2 hover:decoration-current hover:decoration-solid ${className}`}
      >
        {name}
      </button>
      {/* O diálogo vai para o <body> (portal) e só existe depois do primeiro clique: o nome
          costuma estar dentro de um <p>, onde um <dialog> quebraria o HTML (e a hidratação). */}
      {state &&
        createPortal(
          <CardDialog
            open={open}
            name={name}
            card={state.card}
            status={state.status}
            back={back}
            onBackChange={setBack}
            onClose={() => {
              setOpen(false);
              opener.current?.focus();
            }}
          />,
          document.body,
        )}
    </>
  );
}

/** Vários nomes de carta (ex.: dupla de comandantes "A & B"), cada um abrindo a sua carta. */
export function CardNames({
  names,
  separator = ', ',
}: {
  names: readonly string[];
  separator?: string;
}) {
  return (
    <>
      {names.map((name, i) => (
        <Fragment key={`${name}-${i}`}>
          {i > 0 && separator}
          <CardName name={name} />
        </Fragment>
      ))}
    </>
  );
}
