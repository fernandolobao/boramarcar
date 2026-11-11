import type { Metadata } from 'next';
import { isDomainError } from '@boramarcar/core';
import { getDeckCovers, getDeckRatings, getPlayerProfile } from '@boramarcar/db';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PlayerProfile } from '@/components/player-profile';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { ManaFlowColors } from '@/components/mana-flow';
import { GOLD_FLOW } from '@boramarcar/tokens/flow';

type Props = { params: Promise<{ id: string }> };

/** Título da aba com o nome do jogador (WCAG 2.4.2). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const profile = await getPlayerProfile(getDb(), { userId: id, viewerId: user.id }).catch(
    () => null,
  );
  return { title: profile?.name ?? (await getTranslations('nav'))('profile') };
}

/** Perfil de outro jogador: visível para quem divide um grupo com ele. */
export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  if (id === user.id) redirect('/perfil');
  const db = getDb();
  const profile = await getPlayerProfile(db, { userId: id, viewerId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && error.code === 'not_found') notFound();
      throw error;
    },
  );
  const ids = profile.decks.map((d) => d.id);
  const [covers, ratings] = await Promise.all([getDeckCovers(db, ids), getDeckRatings(db, ids)]);
  return (
    <>
      {/* Perfil: fluxo de mana em ouro líquido. */}
      <ManaFlowColors stops={GOLD_FLOW} />
      <PlayerProfile profile={profile} covers={covers} ratings={ratings} />
    </>
  );
}
