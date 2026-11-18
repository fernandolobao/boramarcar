import { isGameFormat } from '@boramarcar/core';
import { getGroupSettings, listEvents, listMembers } from '@boramarcar/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TournamentForm } from '@/components/tournaments/tournament-form';
import { getDb } from '@/server/db';
import { requireUserAndGroup } from '@/server/require-group';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tournaments');
  return pageMetadata({
    section: 'group',
    path: '/torneios/novo',
    title: t('newTitle'),
    description: t('newMetaDescription'),
  });
}

type Props = { searchParams: Promise<{ encontro?: string }> };

/** Novo torneio (dono e admins): num encontro do grupo, que pode vir do link do encontro. */
export default async function NewTournamentPage({ searchParams }: Props) {
  const { user, group } = await requireUserAndGroup();
  const db = getDb();
  const [members, events, settings, t, query] = await Promise.all([
    listMembers(db, group.id),
    listEvents(db, { groupId: group.id, userId: user.id }),
    getGroupSettings(db, { groupId: group.id, userId: user.id }),
    getTranslations('tournaments'),
    searchParams,
  ]);
  const role = members.find((m) => m.userId === user.id)?.role;
  if (role !== 'owner' && role !== 'admin') redirect('/torneios');
  // Mais recentes primeiro (o torneio costuma ser no próximo encontro ou num recente).
  const options = events
    .filter((e) => e.status !== 'cancelled')
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt.toISOString() }));
  const preset = options.some((e) => e.id === query.encontro) ? query.encontro! : null;

  return (
    <>
      <h1 className="page-title">{t('newTitle')}</h1>
      <section className="card mt-4">
        {options.length === 0 ? (
          <p>{t('noEvents')}</p>
        ) : (
          <TournamentForm
            events={options}
            defaultEventId={preset}
            defaultFormat={
              isGameFormat(settings.defaultFormat) ? settings.defaultFormat : 'commander'
            }
          />
        )}
      </section>
    </>
  );
}
