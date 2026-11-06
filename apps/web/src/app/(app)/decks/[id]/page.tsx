import type { Metadata } from 'next';
import { artCropUrl, deckPrice, isDomainError, isGameFormat } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DeleteButton } from '@/components/availability-forms';
import { Icon } from '@/components/icons';
import {
  ColorPips,
  DeckScore,
  DeckSuggestions,
  DeckValidation,
  ManaCurve,
} from '@/components/deck-analysis';
import { ColorIdentity, DeckCards, DeckSettingsForm } from '@/components/deck-visual';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';

type Props = { params: Promise<{ id: string }> };

/** Título da aba com o nome do deck (WCAG 2.4.2). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch(() => null);
  return { title: deck?.name ?? (await getTranslations('nav'))('decks') };
}

export default async function DeckPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
      notFound();
    throw error;
  });
  const t = await getTranslations('decks');
  const ta = await getTranslations('analysis');
  const tc = await getTranslations('common');
  const tf = await getTranslations('formats');
  const fmt = await getFormatter();
  const { analysis } = deck;
  const format = isGameFormat(deck.format) ? deck.format : 'other';
  const commanderEntries = deck.entries.filter((e) => e.board === 'commander');
  const hero = commanderEntries.find((e) => e.card?.imageUri) ?? null;
  const identity = [
    ...new Set(
      (commanderEntries.length ? commanderEntries : deck.entries).flatMap(
        (e) => e.card?.colorIdentity ?? [],
      ),
    ),
  ];
  const price = deckPrice(deck.entries.filter((e) => e.board !== 'maybeboard'));
  const usd = (value: number) => fmt.number(value, { style: 'currency', currency: 'USD' });
  const background = artCropUrl(hero?.card?.imageUri);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {background && (
          // Arte do comandante desfocada como fundo decorativo.
          <Image
            src={background}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="scale-110 object-cover opacity-25 blur-2xl dark:opacity-20"
          />
        )}
        <div className="relative grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,15rem)_1fr] md:items-start">
          {hero?.card?.imageUri && (
            <div className="relative mx-auto aspect-[488/680] w-48 overflow-hidden rounded-[4.5%/3.2%] shadow-xl sm:w-56 md:w-full">
              <Image
                src={hero.card.imageUri}
                alt={hero.name}
                fill
                unoptimized
                priority
                sizes="(min-width: 768px) 15rem, 14rem"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-950/85 px-2.5 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {tf(format)}
              </span>
              <ColorIdentity colors={identity} />
            </div>
            <h1 className="page-title">{deck.name}</h1>
            {analysis.commanders.length > 0 && (
              <p className="text-lg font-medium">{analysis.commanders.join(' & ')}</p>
            )}
            <p className="muted">
              {t('cards', { count: analysis.totalCards })} ·{' '}
              {t('proxies', { count: analysis.proxies })}
              {deck.sourceUrl && (
                <>
                  {' · '}
                  <a href={deck.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                    {deck.source}
                    <Icon name="externalLink" className="ml-0.5 inline size-3.5 align-[-2px]" />
                    <span className="sr-only"> {tc('newTab')}</span>
                  </a>
                </>
              )}
            </p>
            {price.total > 0 && (
              <p className="text-sm">
                <span className="font-medium">{t('price')}:</span>{' '}
                {t('priceValue', { total: usd(price.total), proxies: usd(price.proxies) })}
                {price.missing > 0 && (
                  <span className="muted"> · {t('priceMissing', { count: price.missing })}</span>
                )}
                <span className="muted block text-xs">{t('priceHint')}</span>
              </p>
            )}
            {deck.isOwner && (
              <div className="flex flex-wrap gap-2 pt-1">
                <DeleteButton
                  path={`/api/v1/decks/${deck.id}`}
                  redirectTo="/decks"
                  label={t('deleteDeck', { name: deck.name })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {deck.isOwner && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">{t('settings')}</summary>
          <div className="mt-4">
            <DeckSettingsForm deckId={deck.id} name={deck.name} format={format} />
          </div>
        </details>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">{ta('title')}</h2>
          <DeckScore analysis={analysis} />
        </section>
        <section className="card space-y-6">
          <ManaCurve curve={analysis.manaCurve} />
          <p className="text-sm">
            {ta('averageCmc')}: <strong>{analysis.averageCmc}</strong> · {ta('lands')}:{' '}
            <strong>{analysis.lands}</strong>
          </p>
          <ColorPips pips={analysis.colorPips} />
        </section>
        <section className="card">
          <DeckValidation analysis={analysis} />
        </section>
        <section className="card">
          <DeckSuggestions analysis={analysis} />
        </section>
      </div>

      <DeckCards deckId={deck.id} entries={deck.entries} isOwner={deck.isOwner} />
    </>
  );
}
