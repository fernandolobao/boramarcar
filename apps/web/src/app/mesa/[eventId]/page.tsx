import type { Metadata, Viewport } from 'next';
import { themes } from '@boramarcar/tokens';
import { isDomainError } from '@boramarcar/core';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TableMode } from '@/components/table/table-mode';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { getTableSetup } from '@/server/table-setup';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ eventId: string }> };

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
export default async function TablePage({ params }: Props) {
  const { eventId } = await params;
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
  return (
    <TableMode
      eventId={setup.eventId}
      players={setup.players}
      defaultFormat={setup.defaultFormat}
    />
  );
}
