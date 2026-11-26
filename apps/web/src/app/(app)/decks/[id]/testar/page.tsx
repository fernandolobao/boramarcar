import type { Metadata } from 'next';
import { isDomainError, isGameFormat, startingLifeFor, type PlaytestLine } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { PlaytestTable } from '@/components/playtest/playtest-table';
import { isAdmin } from '@/server/admin';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch(() => null);
  return pageMetadata({
    section: 'deckPlaytest',
    path: `/decks/${id}/testar`,
    title: `${(await getTranslations('playtest'))('title')} · ${deck?.name ?? ''}`,
  });
}

/**
 * Mesa de testes solo (11.4): o deck numa mesa de mentira, no navegador. Só quem pode ver o deck
 * abre; nada é gravado.
 */
export default async function PlaytestPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), {
    deckId: id,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
      notFound();
    throw error;
  });
  const t = await getTranslations('playtest');
  const lines: PlaytestLine[] = deck.lines
    .filter((l) => l.board === 'mainboard' || l.board === 'commander')
    .map((l) => ({
      name: l.name,
      board: l.board,
      quantity: l.quantity,
      // A face da frente diz se é terreno.
      isLand: (l.card?.typeLine ?? '').split('//')[0]!.includes('Land'),
      imageUri: l.card?.imageUri ?? null,
      typeLine: l.card?.typeLine ?? '',
      manaCost: l.card?.manaCost ?? null,
      oracleText: l.card?.oracleText ?? '',
      colorIdentity: l.card?.colorIdentity ?? [],
    }));
  const format = isGameFormat(deck.format) ? deck.format : 'commander';
  return (
    <>
      <Link
        href={`/decks/${id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-link"
      >
        <Icon name="back" />
        {t('back', { deck: deck.name })}
      </Link>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted max-w-2xl">{t('intro', { deck: deck.name })}</p>
      </div>
      <PlaytestTable lines={lines} startingLife={startingLifeFor(format)} />
    </>
  );
}
