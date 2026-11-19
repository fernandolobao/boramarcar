import { getTournament, listDismissedTips } from '@boramarcar/db';
import type { Metadata, Viewport } from 'next';
import { themes } from '@boramarcar/tokens';
import { isDomainError, isGameFormat } from '@boramarcar/core';
import { tableModeEligible } from '@boramarcar/core/tournaments';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TableMode, type TableTournament } from '@/components/table/table-mode';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { getTableSetup } from '@/server/table-setup';
import { pageMetadata } from '@/server/seo';

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ torneio?: string; mesa?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  return pageMetadata({
    section: 'table',
    path: `/mesa/${eventId}`,
    title: (await getTranslations('table'))('title'),
  });
}

/** Ocupa a tela toda (inclusive sob o recorte da câmera) e pinta as barras do sistema de escuro. */
export const viewport: Viewport = { viewportFit: 'cover', themeColor: themes.dark.canvas };

/** Modo mesa em tela cheia (fora do layout do app, para caber no celular deitado na mesa). */
export default async function TablePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const setup = await getTableSetup(getDb(), { eventId, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden')) {
        notFound();
      }
      throw error;
    },
  );
  if (setup.status === 'cancelled') notFound();
  const dismissed = await listDismissedTips(getDb(), { userId: user.id });
  // Mesa de torneio (9.1): `?torneio=<id>&mesa=<mesa>`, só para quem joga nela ou organiza.
  let tournament: TableTournament | undefined;
  if (query.torneio && query.mesa) {
    const view = await getTournament(getDb(), {
      tournamentId: query.torneio,
      userId: user.id,
    }).catch(() => null);
    const table = view?.rounds.at(-1)?.tables.find((x) => x.id === query.mesa);
    if (!view || !table || view.tournament.eventId !== setup.eventId) notFound();
    const seated = table.entrants.map((id) => view.entrants.find((e) => e.id === id)!);
    const atTable = seated.some((e) => e.memberIds.includes(user.id));
    if (!tableModeEligible(view.tournament, table) || !(view.canManage || atTable)) notFound();
    const format = view.tournament.format;
    tournament = {
      id: view.tournament.id,
      name: view.tournament.name,
      tableId: table.id,
      tableNumber: table.number,
      format: isGameFormat(format) ? format : 'other',
      seats: seated.map((e) => e.memberIds[0]!),
      entrantOf: Object.fromEntries(seated.map((e) => [e.memberIds[0]!, e.id])),
    };
  }
  return (
    <TableMode
      eventId={setup.eventId}
      players={setup.players}
      defaultFormat={setup.defaultFormat}
      showTip={!dismissed.includes('table')}
      tournament={tournament}
    />
  );
}
