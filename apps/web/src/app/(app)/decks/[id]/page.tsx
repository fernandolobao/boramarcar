import type { Metadata } from 'next';
import { printLabel } from '@/lib/print-label';
import { outsideDeck } from '@boramarcar/core';
import { PublishDeck } from '@/components/deck-forms';
import {
  artCropUrl,
  DECK_BOARDS,
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
import { DraftBadge, VisibilityBadge } from '@/components/deck-grid';
import {
  compareWithCommanderDecks,
  draftCollectionMatches,
  getDeck,
  listDismissedTips,
} from '@boramarcar/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ViewTransition } from 'react';
import { DeckHeroCard } from '@/components/deck-hero-card';
import { getFormatter, getTranslations } from 'next-intl/server';
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
import { ModalButton } from '@/components/modal-button';
import { OpeningHand } from '@/components/opening-hand';
import { DeckComparisonCard } from '@/components/deck-comparison';
import { DeckRoles, RefreshAnalysis } from '@/components/deck-roles';
import { DeckActions } from '@/components/deck-tools';
import { ColorIdentity } from '@/components/deck-visual';
import { runAfterResponse } from '@/server/background';
import { isAdmin } from '@/server/admin';
import { requireUser } from '@/server/current-user';
import { TitleWithTip } from '@/components/tip';
import { refreshDeckAnalysis } from '@/server/deck-analysis';
import { getUsdBrlRate } from '@/server/exchange-rate';
import { getDb } from '@/server/db';
import { CardNames, DeckPrintsProvider } from '@/components/card-dialog';
import { PillTabs } from '@/components/ds/tabs';
import { ManaFlowColors } from '@/components/mana-flow';
import { deckBarBackground, deckBarEdge, deckFlow } from '@boramarcar/tokens/flow';
import { deckMetadata } from '@/server/seo-pages';
import { DeckShare } from '@/components/deck-share';
import { getBaseUrl } from '@/env';
import { linkQrCode } from '@/server/invite';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicado?: string }>;
};

/** Título da aba com o nome do deck (WCAG 2.4.2). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch(() => null);
  return deckMetadata(id, deck?.name ?? (await getTranslations('nav'))('decks'));
}

export default async function DeckPage({ params, searchParams }: Props) {
  const justPublished = (await searchParams).publicado === '1';
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), {
    deckId: id,
    viewerId: user.id,
    // Admins da plataforma veem qualquer deck (o acesso a deck fechado fica registrado).
    viewerIsAdmin: isAdmin(user.email),
  }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
      notFound();
    throw error;
  });
  // Dica da análise (7.4), enquanto a pessoa não a dispensar.
  const showTip = !(await listDismissedTips(getDb(), { userId: user.id })).includes(
    'deck-analysis',
  );
  const t = await getTranslations('decks');
  // Rascunho do próprio dono: cartas que ele já tem livres na coleção (selos e janela de publicar).
  const matches =
    deck.status === 'draft' && deck.isOwner
      ? await draftCollectionMatches(getDb(), { deckId: deck.id, userId: user.id })
      : [];
  const matchOf = new Map(matches.map((m) => [m.name.toLowerCase(), m]));
  const inCollection = Object.fromEntries(matches.map((m) => [m.name.toLowerCase(), m.free]));
  const publishCandidates = deck.lines
    .filter(
      (l) =>
        !outsideDeck(l.board) && l.quantity - l.proxies > 0 && matchOf.has(l.name.toLowerCase()),
    )
    .map((l) => ({
      key: l.key,
      name: l.name,
      board: l.board,
      fromScryfallId: l.scryfallId,
      fromLabel: printLabel(l.card),
      options: matchOf.get(l.name.toLowerCase())!.options.map((o) => ({
        scryfallId: o.scryfallId,
        foil: o.foil,
        free: o.free,
        label: printLabel(o),
      })),
    }));
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
  const price = deckPrice(deck.entries.filter((e) => !outsideDeck(e.board)));
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
  if (deck.analysisStale && !deck.viewedAsAdmin) {
    runAfterResponse(() => refreshDeckAnalysis(getDb(), { deckId: deck.id, viewerId: user.id }));
  }

  // Fluxo de mana nas cores do deck, no peso dos símbolos de mana de cada cor.
  const flow = deckFlow(
    identity,
    Object.fromEntries(analysis.manaBase.map((row) => [row.color, row.pips])),
  );
  // Deck público: link e QR Code para compartilhar.
  const shareUrl = `${getBaseUrl()}/decks/${deck.id}`;
  const shareQr = deck.visibility === 'public' ? await linkQrCode(shareUrl) : null;
  // Nomes de carta na análise abrem a edição usada no deck (comandante e deck principal primeiro).
  const deckPrints = [...deck.lines]
    .sort((a, b) => DECK_BOARDS.indexOf(a.board) - DECK_BOARDS.indexOf(b.board))
    .map((l) => ({
      name: l.name,
      card: l.card
        ? {
            typeLine: l.card.typeLine,
            manaCost: l.card.manaCost,
            imageUri: l.card.imageUri,
            backImageUri: l.card.backImageUri,
            backName: l.card.backName,
            setCode: l.card.setCode,
            setName: l.card.setName,
            collectorNumber: l.card.collectorNumber,
            priceUsd: l.card.priceUsd,
          }
        : null,
    }));
  return (
    <DeckPrintsProvider cards={deckPrints}>
      {/* Barras dos gráficos nas cores do deck (curva, nota, mão inicial), nos dois temas. */}
      <div
        className="space-y-6"
        style={
          {
            '--deck-bar-light': deckBarBackground(identity, 'light'),
            '--deck-bar-dark': deckBarBackground(identity, 'dark'),
            '--deck-bar-edge-light': deckBarEdge(identity, 'light'),
            '--deck-bar-edge-dark': deckBarEdge(identity, 'dark'),
          } as React.CSSProperties
        }
      >
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
          {/* Opções do deck (editar, exportar, imprimir, atualizar) num menu no canto do topo. */}
          <div className="relative z-10 flex justify-end px-5 pt-4 md:absolute md:top-4 md:right-4 md:p-0">
            <DeckActions
              deckId={deck.id}
              isOwner={deck.isOwner}
              source={deck.source === 'moxfield' ? 'Moxfield' : 'Archidekt'}
              proxyCount={deck.lines.reduce((sum, l) => sum + l.proxies, 0)}
              hasSourceUrl={
                Boolean(deck.sourceUrl) &&
                (deck.source === 'archidekt' || deck.source === 'moxfield')
              }
              edit={
                deck.isOwner
                  ? {
                      name: deck.name,
                      format,
                      visibility: (DECK_VISIBILITIES as readonly string[]).includes(deck.visibility)
                        ? (deck.visibility as DeckVisibility)
                        : 'group',
                    }
                  : undefined
              }
            />
          </div>
          <div
            className={`relative grid gap-6 p-5 sm:p-6 md:items-start ${hero?.card?.imageUri ? 'md:grid-cols-[minmax(0,15rem)_1fr]' : ''}`}
          >
            {hero?.card?.imageUri && (
              <ViewTransition name={`deck-${deck.id}`} share="morph" default="none">
                <DeckHeroCard
                  name={hero.name}
                  imageUri={hero.card.imageUri}
                  backImageUri={hero.card.backImageUri}
                  backName={hero.card.backName}
                />
              </ViewTransition>
            )}
            <div className="min-w-0 space-y-3 md:pe-52">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink-950/85 px-2.5 py-1 text-xs font-medium text-white dark:bg-ink-100 dark:text-ink-900">
                  {tf(format)}
                </span>
                <ColorIdentity colors={identity} />
                {deck.status === 'draft' && <DraftBadge />}
                <VisibilityBadge visibility={deck.visibility} />
              </div>
              <h1 className="page-title">{deck.name}</h1>
              {deck.status === 'draft' && deck.isOwner && (
                <PublishDeck deckId={deck.id} candidates={publishCandidates} />
              )}
              {justPublished && deck.status === 'published' && (
                <p role="status" className="flex items-center gap-2 font-medium">
                  <Icon name="publish" />
                  {t('draft.published')}
                </p>
              )}
              {!deck.isOwner && (
                <p className="text-sm">
                  <Link
                    href={`/jogadores/${deck.ownerId}`}
                    className="underline underline-offset-2"
                  >
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
            </div>
          </div>
        </div>

        {shareQr && (
          <DeckShare
            deck={{ id: deck.id, name: deck.name, visibility: deck.visibility }}
            url={shareUrl}
            qr={shareQr}
          />
        )}

        {deck.viewedAsAdmin && (
          <p
            role="note"
            className="rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm"
          >
            <Icon name="makeAdmin" className="me-1 inline size-4 align-[-2px]" />
            {t('viewedAsAdmin')}
          </p>
        )}

        {/* Análise num card só, com abas (a escolhida fica no endereço: ?aba=mana). */}
        <section className="card space-y-4" aria-labelledby="deck-analysis-title">
          <TitleWithTip id="deck-analysis" dismissed={!showTip}>
            <h2 id="deck-analysis-title" className="section-title mb-0">
              {ta('title')}
            </h2>
          </TitleWithTip>
          <PillTabs
            label={ta('tabsLabel')}
            param="aba"
            tabs={[
              {
                id: 'geral',
                title: ta('tabs.overview'),
                badge: analysis.validation.length,
                badgeLabel: ta('tabs.issues', { count: analysis.validation.length }),
                content: (
                  <div className="space-y-6">
                    <DeckScore analysis={analysis} formatName={formatName} />
                    <RefreshAnalysis deckId={deck.id} stale={deck.analysisStale} />
                    <section className="border-t border-line pt-6">
                      <DeckValidation analysis={analysis} formatName={formatName} />
                    </section>
                  </div>
                ),
              },
              {
                id: 'mana',
                title: ta('tabs.mana'),
                content: (
                  <div className="space-y-6">
                    <ManaCurve curve={analysis.manaCurve} cardsByCurve={analysis.cardsByCurve} />
                    <p className="text-sm">
                      {ta('averageCmc')}: <strong>{analysis.averageCmc}</strong> · {ta('lands')}:{' '}
                      <strong>{analysis.lands}</strong>
                    </p>
                    <ColorPips pips={analysis.colorPips} />
                    <section className="border-t border-line pt-6">
                      <ManaBaseTable rows={analysis.manaBase} missing={analysis.manaDataMissing} />
                    </section>
                  </div>
                ),
              },
              ...(analysis.handOdds
                ? [
                    {
                      id: 'mao',
                      title: ta('tabs.hand'),
                      content: (
                        <HandOdds
                          odds={analysis.handOdds}
                          action={
                            <ModalButton
                              label={t('hand.open')}
                              title={t('hand.title')}
                              icon="openingHand"
                            >
                              <p className="muted text-sm">{t('hand.intro')}</p>
                              {/* Só o deck principal; a face da frente diz se é terreno. */}
                              <OpeningHand
                                lines={deck.lines.map((l) => ({
                                  name: l.name,
                                  board: l.board,
                                  quantity: l.quantity,
                                  isLand: (l.card?.typeLine ?? '').split('//')[0]!.includes('Land'),
                                  imageUri: l.card?.imageUri ?? null,
                                }))}
                              />
                            </ModalButton>
                          }
                        />
                      ),
                    },
                  ]
                : []),
              {
                id: 'funcoes',
                title: ta('tabs.roles'),
                content: (
                  <div className="space-y-6">
                    <DeckRoles
                      deckId={deck.id}
                      roles={analysis.roles}
                      cardsByRole={analysis.cardsByRole}
                      targets={profile.roleTargets}
                      tagged={analysis.rolesTagged}
                    />
                    {analysis.suggestions.length > 0 && (
                      <section className="border-t border-line pt-6">
                        <DeckSuggestions analysis={analysis} />
                      </section>
                    )}
                  </div>
                ),
              },
              ...(deck.bracket || analysis.commanders.length > 0
                ? [
                    {
                      id: 'bracket',
                      title: ta('tabs.bracket'),
                      content: (
                        <div className="space-y-6">
                          {deck.bracket && <BracketCard bracket={deck.bracket} />}
                          {analysis.commanders.length > 0 && (
                            <section className={deck.bracket ? 'border-t border-line pt-6' : ''}>
                              <DeckComparisonCard
                                commanders={analysis.commanders}
                                comparison={comparison}
                                edhrecUrl={edhrecCommanderUrl(analysis.commanders)}
                                leastPopular={leastPopularCards(deck.entries)}
                              />
                            </section>
                          )}
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </section>

        <DeckCards
          deckId={deck.id}
          lines={deck.lines}
          isOwner={deck.isOwner}
          inCollection={inCollection}
          usdBrl={rate?.rate ?? null}
        />
      </div>
    </DeckPrintsProvider>
  );
}
