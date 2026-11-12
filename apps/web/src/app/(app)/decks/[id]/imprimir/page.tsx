import type { Metadata } from 'next';
import { CARD_MM, expandPrintList, isDomainError, PAGE_MM, type PageSize } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { PrintButton } from '@/components/print-button';
import { requireUser } from '@/server/current-user';
import { canPrintProxies } from '@/server/features';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ which?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch(() => null);
  return pageMetadata({
    section: 'deckPrint',
    path: `/decks/${id}/imprimir`,
    title: `${(await getTranslations('decks'))('print')} · ${deck?.name ?? ''}`,
  });
}

const COLS = 3;
const ROWS = 3;
const MARK_MM = 4;

/**
 * Folha de proxies para imprimir pelo navegador: as imagens são carregadas pelo próprio
 * navegador (sem depender do servidor baixar do Scryfall) e o CSS usa milímetros reais.
 */
export default async function PrintProxiesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  // Atrás da flag `print-proxy` e só para admin.
  if (!(await canPrintProxies(user))) notFound();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
      notFound();
    throw error;
  });
  const t = await getTranslations('decks');
  const which = query.which === 'all' ? 'all' : 'proxies';
  const paper: PageSize = query.page === 'letter' ? 'letter' : 'a4';
  const size = PAGE_MM[paper];
  const items = expandPrintList(
    deck.lines.filter((l) => l.board !== 'maybeboard'),
    which,
  );
  const pages = Array.from({ length: Math.ceil(items.length / (COLS * ROWS)) }, (_, i) =>
    items.slice(i * COLS * ROWS, (i + 1) * COLS * ROWS),
  );
  const gridW = COLS * CARD_MM.width;
  const gridH = ROWS * CARD_MM.height;
  const left = (size.width - gridW) / 2;
  const top = (size.height - gridH) / 2;

  return (
    <>
      {/* Tamanho do papel e sem margens do navegador: as medidas abaixo já são reais. */}
      <style>{`@page { size: ${size.width}mm ${size.height}mm; margin: 0; }
        @media print { body { background: white !important; } .print-sheet { box-shadow: none !important; margin: 0 !important; } .print-sheet + .print-sheet { break-before: page; } }`}</style>
      <div className="space-y-3 print:hidden">
        <Link
          href={`/decks/${deck.id}`}
          className="inline-flex items-center gap-1 text-sm underline"
        >
          <Icon name="previous" />
          {deck.name}
        </Link>
        <h1 className="page-title">{t('print')}</h1>
        <p className="muted max-w-prose">
          {t('printBrowserHint', { count: items.length, pages: pages.length })}
        </p>
        {items.length > 0 ? (
          <PrintButton />
        ) : (
          <p role="status">{which === 'proxies' ? t('printNoProxies') : t('printEmpty')}</p>
        )}
      </div>

      {/* Pré-visualização na tela = o que sai na impressão. Rola para o lado no celular. */}
      <div
        role="region"
        aria-label={t('printPreview')}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco pelo teclado
        tabIndex={0}
        className="-mx-4 overflow-x-auto px-4 print:m-0 print:overflow-visible print:p-0"
      >
        {pages.map((cards, p) => (
          <section
            key={p}
            aria-label={t('printPage', { page: p + 1, total: pages.length })}
            className="print-sheet relative mx-auto my-6 bg-white shadow-lg"
            style={{ width: `${size.width}mm`, height: `${size.height}mm` }}
          >
            {cards.map((card, i) => (
              <div
                key={i}
                className="absolute overflow-hidden bg-ink-100"
                style={{
                  left: `${left + (i % COLS) * CARD_MM.width}mm`,
                  top: `${top + Math.floor(i / COLS) * CARD_MM.height}mm`,
                  width: `${CARD_MM.width}mm`,
                  height: `${CARD_MM.height}mm`,
                }}
              >
                {card.imageUri ? (
                  // eslint-disable-next-line @next/next/no-img-element -- impressão: imagem original, sem otimização
                  <img src={card.imageUri} alt={card.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="block border border-ink-500 p-2 text-xs text-black">
                    {card.name}
                  </span>
                )}
              </div>
            ))}
            {/* Marcas de corte nas divisas da grade, fora das cartas. */}
            {Array.from({ length: COLS + 1 }, (_, c) => left + c * CARD_MM.width).map((x) => (
              <div key={`x${x}`} aria-hidden="true">
                <span
                  className="absolute w-px bg-ink-500"
                  style={{ left: `${x}mm`, top: `${top - MARK_MM - 1}mm`, height: `${MARK_MM}mm` }}
                />
                <span
                  className="absolute w-px bg-ink-500"
                  style={{ left: `${x}mm`, top: `${top + gridH + 1}mm`, height: `${MARK_MM}mm` }}
                />
              </div>
            ))}
            {Array.from({ length: ROWS + 1 }, (_, r) => top + r * CARD_MM.height).map((y) => (
              <div key={`y${y}`} aria-hidden="true">
                <span
                  className="absolute h-px bg-ink-500"
                  style={{ top: `${y}mm`, left: `${left - MARK_MM - 1}mm`, width: `${MARK_MM}mm` }}
                />
                <span
                  className="absolute h-px bg-ink-500"
                  style={{ top: `${y}mm`, left: `${left + gridW + 1}mm`, width: `${MARK_MM}mm` }}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
