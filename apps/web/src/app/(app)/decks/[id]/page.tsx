import type { Metadata } from 'next';
import {
  artCropUrl,
  DECK_VISIBILITIES,
  deckFormatProfile,
  edhrecCommanderUrl,
  leastPopularCards,
  deckPrice,
  usdToBrl,
  isDomainError,
  isGameFormat,
  type DeckVisibility,
} from '@boramarcar/core';
import Link from 'next/link';
import { VisibilityBadge } from '@/components/deck-grid';
import { compareWithCommanderDecks, getDeck } from '@boramarcar/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ViewTransition } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { DeleteButton } from '@/components/availability-forms';
import { Icon } from '@/components/icons';
import {
  BracketCard,
  ColorPips,
  DeckScore,
  HandOdds,
  ManaBaseTable,
  DeckSuggestions,
  DeckValidation,
  ManaCurve,
} from '@/components/deck-analysis';
import { DeckCards } from '@/components/deck-cards';
import { DeckComparisonCard } from '@/components/deck-comparison';
import { DeckRoles, RefreshAnalysis } from '@/components/deck-roles';
import { DeckTools } from '@/components/deck-tools';
import { ColorIdentity, DeckSettingsForm } from '@/components/deck-visual';
import { runAfterResponse } from '@/server/background';
import { requireUser } from '@/server/current-user';
import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { getUsdBrlRate } from '@/server/exchange-rate';
import { getDb } from '@/server/db';
import { CardNames } from '@/components/card-dialog';
import { StackSections } from '@/components/stack-sections';
import { ManaFlowColors } from '@/components/mana-flow';
import { deckFlow } from '@boramarcar/tokens/flow';

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
  const tp = await getTranslations('player');
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
  const brl = (value: number) => fmt.number(value, { style: 'currency', currency: 'BRL' });
  const rate = price.total > 0 ? await getUsdBrlRate() : null;
  const background = artCropUrl(hero?.card?.imageUri);
  const profile = deckFormatProfile(format);
  const comparison = analysis.commanders.length
    ? await compareWithCommanderDecks(getDb(), {
        deckId: deck.id,
        viewerId: user.id,
        format,
        commanders: analysis.commanders,
        entries: deck.entries,
      })
    : null;
  const formatName = tf(format);
  // Dados do Tagger/Spellbook faltando: busca depois de responder (a próxima visita já vê).
  if (deck.analysisStale) {
    runAfterResponse(() => refreshDeckAnalysis(getDb(), { deckId: deck.id, viewerId: user.id }));
  }

  // Fluxo de mana nas cores do deck, no peso dos símbolos de mana de cada cor.
  const flow = deckFlow(
    identity,
    Object.fromEntries(analysis.manaBase.map((row) => [row.color, row.pips])),
  );
  return (
    <>
      <ManaFlowColors stops={flow} />
      <div className="relative overflow-hidden rounded-3xl border border-ink-200 bg-surface dark:border-ink-800 dark:bg-ink-900">
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
            <ViewTransition name={`deck-${deck.id}`} share="morph" default="none">
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
            </ViewTransition>
          )}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink-950/85 px-2.5 py-1 text-xs font-medium text-white dark:bg-ink-100 dark:text-ink-900">
                {tf(format)}
              </span>
              <ColorIdentity colors={identity} />
              <VisibilityBadge visibility={deck.visibility} />
            </div>
            <h1 className="page-title">{deck.name}</h1>
            {!deck.isOwner && (
              <p className="text-sm">
                <Link href={`/jogadores/${deck.ownerId}`} className="underline underline-offset-2">
                  {tp('ownerOf', { name: deck.ownerName })}
                </Link>
              </p>
            )}
            {analysis.commanders.length > 0 && (
              <p className="text-lg font-medium">
                <CardNames names={analysis.commanders} separator=" & " />
              </p>
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
                {rate && (
                  <>
                    {' · '}
                    {t('priceBrl', {
                      total: brl(usdToBrl(price.total, rate.rate)),
                      proxies: brl(usdToBrl(price.proxies, rate.rate)),
                    })}
                  </>
                )}
                {price.missing > 0 && (
                  <span className="muted"> · {t('priceMissing', { count: price.missing })}</span>
                )}
                <span className="muted block text-xs">
                  {rate
                    ? t('priceHintBrl', {
                        rate: brl(rate.rate),
                        date: fmt.dateTime(new Date(`${rate.date}T12:00:00Z`), {
                          dateStyle: 'short',
                        }),
                      })
                    : t('priceHint')}
                </span>
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
            <DeckSettingsForm
              deckId={deck.id}
              name={deck.name}
              format={format}
              visibility={
                (DECK_VISIBILITIES as readonly string[]).includes(deck.visibility)
                  ? (deck.visibility as DeckVisibility)
                  : 'group'
              }
            />
          </div>
        </details>
      )}

      {/* Análise em pilha de cartas: cada seção desliza por cima da anterior ao rolar. */}
      <StackSections>
        <section className="card space-y-4">
          <h2 className="section-title mb-0">{ta('title')}</h2>
          <DeckScore analysis={analysis} formatName={formatName} />
          <RefreshAnalysis deckId={deck.id} stale={deck.analysisStale} />
        </section>
        <section className="card space-y-6">
          <ManaCurve curve={analysis.manaCurve} cardsByCurve={analysis.cardsByCurve} />
          <p className="text-sm">
            {ta('averageCmc')}: <strong>{analysis.averageCmc}</strong> · {ta('lands')}:{' '}
            <strong>{analysis.lands}</strong>
          </p>
          <ColorPips pips={analysis.colorPips} />
        </section>
        <section className="card">
          <DeckValidation analysis={analysis} formatName={formatName} />
        </section>
        {analysis.suggestions.length > 0 && (
          <section className="card">
            <DeckSuggestions analysis={analysis} />
          </section>
        )}
        {deck.bracket && (
          <section className="card">
            <BracketCard bracket={deck.bracket} />
          </section>
        )}
        <section className="card">
          <DeckRoles
            deckId={deck.id}
            roles={analysis.roles}
            cardsByRole={analysis.cardsByRole}
            targets={profile.roleTargets}
            tagged={analysis.rolesTagged}
          />
        </section>
        <section className="card">
          <ManaBaseTable rows={analysis.manaBase} missing={analysis.manaDataMissing} />
        </section>
        {analysis.commanders.length > 0 && (
          <section className="card">
            <DeckComparisonCard
              commanders={analysis.commanders}
              comparison={comparison}
              edhrecUrl={edhrecCommanderUrl(analysis.commanders)}
              leastPopular={leastPopularCards(deck.entries)}
            />
          </section>
        )}
        {analysis.handOdds && (
          <section className="card">
            <HandOdds odds={analysis.handOdds} />
          </section>
        )}
      </StackSections>

      <DeckCards
        deckId={deck.id}
        lines={deck.lines}
        isOwner={deck.isOwner}
        usdBrl={rate?.rate ?? null}
      />

      <DeckTools
        deckId={deck.id}
        isOwner={deck.isOwner}
        source={deck.source === 'moxfield' ? 'Moxfield' : 'Archidekt'}
        proxyCount={deck.lines.reduce((sum, l) => sum + l.proxies, 0)}
        hasSourceUrl={
          Boolean(deck.sourceUrl) && (deck.source === 'archidekt' || deck.source === 'moxfield')
        }
      />
    </>
  );
}
