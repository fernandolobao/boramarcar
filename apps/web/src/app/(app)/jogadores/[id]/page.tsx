import type { Metadata } from 'next';
import { isDomainError } from '@boramarcar/core';
import { getDeckCovers, getDeckRatings, getGroupStats, getPlayerProfile } from '@boramarcar/db';
import { headToHeadBetween } from '@boramarcar/core/integration';
import { getActiveGroup } from '@/server/active-group';
import { notFound, redirect } from 'next/navigation';
import { getTimeZone, getTranslations } from 'next-intl/server';
import { PlayerProfile } from '@/components/player-profile';
import { isAdmin } from '@/server/admin';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { ManaFlowColors } from '@/components/mana-flow';
import { GOLD_FLOW } from '@boramarcar/tokens/flow';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ id: string }> };

/** Título da aba com o nome do jogador (WCAG 2.4.2). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const profile = await getPlayerProfile(getDb(), {
    userId: id,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  }).catch(() => null);
  // O nome aparece na aba de quem já entrou; a prévia de link (sem login) é genérica.
  return pageMetadata({
    section: 'player',
    path: `/jogadores/${id}`,
    title: profile?.name ?? (await getTranslations('nav'))('profile'),
  });
}

/** Perfil de outro jogador: visível para quem divide um grupo com ele e para os admins. */
export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  if (id === user.id) redirect('/perfil');
  const db = getDb();
  const profile = await getPlayerProfile(db, {
    userId: id,
    viewerId: user.id,
    viewerIsAdmin: isAdmin(user.email),
  }).catch((error: unknown) => {
    if (isDomainError(error) && error.code === 'not_found') notFound();
    throw error;
  });
  const ids = profile.decks.map((d) => d.id);
  // Confronto entre vocês dois no grupo ativo (se a pessoa também é dele).
  const { active } = await getActiveGroup(user.id);
  const sharesActive = active && profile.groups.some((g) => g.id === active.id);
  const [covers, ratings, stats] = await Promise.all([
    getDeckCovers(db, ids),
    getDeckRatings(db, ids),
    sharesActive
      ? getGroupStats(db, {
          groupId: active.id,
          userId: user.id,
          now: new Date(),
          timeZone: await getTimeZone(),
        }).catch(() => null)
      : null,
  ]);
  const versus = stats ? headToHeadBetween(stats.headToHead, user.id, id) : null;
  return (
    <>
      {/* Perfil: fluxo de mana em ouro líquido. */}
      <ManaFlowColors stops={GOLD_FLOW} />
      <PlayerProfile profile={profile} covers={covers} ratings={ratings} versus={versus} />
    </>
  );
}
