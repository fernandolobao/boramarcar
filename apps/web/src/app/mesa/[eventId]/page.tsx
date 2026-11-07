import type { Metadata } from 'next';
import { isDomainError } from '@boramarcar/core';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TableMode } from '@/components/table/table-mode';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { getTableSetup } from '@/server/table-setup';

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('table'))('title') };
}

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
