import type { Metadata } from 'next';
import { isDomainError } from '@boramarcar/core';
import { getEventDetail, getGroupSettings, listDecksForUsers, listMembers } from '@boramarcar/db';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TableMode } from '@/components/table/table-mode';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('table'))('title') };
}

/** Modo mesa em tela cheia (fora do layout do app, para caber no celular deitado na mesa). */
export default async function TablePage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireUser();
  const db = getDb();
  const event = await getEventDetail(db, { eventId, userId: user.id }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden')) {
      notFound();
    }
    throw error;
  });
  if (event.status === 'cancelled') notFound();
  const [members, settings] = await Promise.all([
    listMembers(db, event.groupId),
    getGroupSettings(db, { groupId: event.groupId, userId: user.id }),
  ]);
  const decks = await listDecksForUsers(
    db,
    members.map((m) => m.userId),
  );
  const confirmed = new Set(
    event.participants.filter((p) => p.rsvp === 'yes').map((p) => p.userId),
  );
  const players = [...members]
    .sort((a, b) => Number(confirmed.has(b.userId)) - Number(confirmed.has(a.userId)))
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      confirmed: confirmed.has(m.userId),
      decks: decks.filter((d) => d.ownerId === m.userId).map((d) => ({ id: d.id, name: d.name })),
    }));
  return <TableMode eventId={event.id} players={players} defaultFormat={settings.defaultFormat} />;
}
