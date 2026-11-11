import { listCollection } from '@boramarcar/db';
import { getTranslations } from 'next-intl/server';
import { CollectionView } from '@/components/collection-view';
import { ManaFlowColors } from '@/components/mana-flow';
import { collectionFlow } from '@boramarcar/tokens/flow';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { getUsdBrlRate } from '@/server/exchange-rate';
import { navMetadata } from '@/server/metadata';

export const generateMetadata = navMetadata('collection');

/** Coleção pessoal: as cartas que a pessoa tem (sem proxies), com filtros e valor total. */
export default async function CollectionPage() {
  const user = await requireUser();
  const [entries, rate] = await Promise.all([
    listCollection(getDb(), user.id),
    getUsdBrlRate().catch(() => null),
  ]);
  const t = await getTranslations('collection');
  return (
    <>
      {/* Fluxo de mana na proporção das cores da coleção (identidade de cor: terrenos básicos contam). */}
      <ManaFlowColors
        stops={collectionFlow(
          entries.map((e) => ({ colors: e.card?.colorIdentity, quantity: e.quantity })),
        )}
      />
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted max-w-3xl">{t('intro')}</p>
      </div>
      <CollectionView
        entries={entries.map((e) => ({ ...e, addedAt: e.addedAt.toISOString() }))}
        brlRate={rate?.rate ?? null}
        rateDate={rate?.date ?? null}
      />
    </>
  );
}
