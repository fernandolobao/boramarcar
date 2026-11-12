'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { flipCard } from './card-flip';
import { Icon } from './icons';

/**
 * Carta do comandante no topo da página do deck. Nas cartas de duas faces, "Virar" mostra o
 * verso com a mesma animação da grade e do diálogo (`card-flip.ts`); o texto alternativo
 * acompanha a face à mostra.
 */
export function DeckHeroCard({
  name,
  imageUri,
  backImageUri,
  backName,
}: {
  name: string;
  imageUri: string;
  backImageUri?: string | null;
  backName?: string | null;
}) {
  const t = useTranslations('decks');
  const [back, setBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const showBack = back && Boolean(backImageUri);

  return (
    <div className="relative mx-auto w-48 sm:w-56 md:w-full">
      <div
        ref={cardRef}
        className="relative aspect-[488/680] w-full overflow-hidden rounded-[4.5%/3.2%] shadow-xl"
      >
        <Image
          src={showBack ? backImageUri! : imageUri}
          alt={showBack ? (backName ?? name) : name}
          fill
          unoptimized
          priority
          sizes="(min-width: 768px) 15rem, 14rem"
          className="object-cover"
        />
      </div>
      {backImageUri && (
        <button
          type="button"
          className="absolute right-2 bottom-[6%] inline-flex items-center gap-1 rounded-md bg-ink-950/85 px-2 py-1 text-xs font-medium text-white hover:bg-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-pressed={back}
          onClick={() => {
            const toBack = !back;
            flipCard(cardRef.current, () => setBack(toBack), {
              toBack,
              preload: toBack ? backImageUri : imageUri,
            });
          }}
        >
          <Icon name="flip" className="size-3.5 shrink-0" />
          {t('flip')}
          <span className="sr-only"> ({name})</span>
        </button>
      )}
    </div>
  );
}
