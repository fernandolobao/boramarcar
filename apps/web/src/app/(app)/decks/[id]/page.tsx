import { DECK_BOARDS, isDomainError } from '@boramarcar/core';
import { getDeck } from '@boramarcar/db';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DeleteButton } from '@/components/availability-forms';
import {
  ColorPips,
  DeckScore,
  DeckSuggestions,
  DeckValidation,
  ManaCurve,
} from '@/components/deck-analysis';
import { ProxyToggle } from '@/components/deck-forms';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(getDb(), { deckId: id, viewerId: user.id }).catch((error: unknown) => {
    if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
      notFound();
    throw error;
  });
  const t = await getTranslations('decks');
  const ta = await getTranslations('analysis');
  const { analysis } = deck;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{deck.name}</h1>
          <p className="muted">
            {analysis.commanders.join(' + ')} · {t('cards', { count: analysis.totalCards })} ·{' '}
            {t('proxies', { count: analysis.proxies })}
            {deck.sourceUrl && (
              <>
                {' · '}
                <a href={deck.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  {deck.source}
                </a>
              </>
            )}
          </p>
        </div>
        {deck.isOwner && <DeleteButton path={`/api/v1/decks/${deck.id}`} redirectTo="/decks" />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">{ta('title')}</h2>
          <DeckScore analysis={analysis} />
        </section>
        <section className="card space-y-6">
          <ManaCurve curve={analysis.manaCurve} />
          <p className="text-sm">
            {ta('averageCmc')}: <strong>{analysis.averageCmc}</strong> · {ta('lands')}:{' '}
            <strong>{analysis.lands}</strong>
          </p>
          <ColorPips pips={analysis.colorPips} />
        </section>
        <section className="card">
          <DeckValidation analysis={analysis} />
        </section>
        <section className="card">
          <DeckSuggestions analysis={analysis} />
        </section>
      </div>

      {DECK_BOARDS.map((board) => {
        const entries = deck.entries.filter((e) => e.board === board);
        if (!entries.length) return null;
        return (
          <section key={board} className="card">
            <h2 className="section-title">
              {t(`boards.${board}`)} ({entries.reduce((sum, e) => sum + e.quantity, 0)})
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="w-10 py-1.5 tabular-nums">{entry.quantity}</td>
                    <td className="py-1.5">
                      {entry.name}
                      {!entry.card && <span className="muted"> ?</span>}
                    </td>
                    <td className="muted hidden py-1.5 sm:table-cell">{entry.card?.typeLine}</td>
                    <td className="py-1.5 text-right">
                      {deck.isOwner ? (
                        <label className="inline-flex items-center gap-1 text-xs">
                          <ProxyToggle
                            deckId={deck.id}
                            cardId={entry.id}
                            isProxy={entry.isProxy}
                            label={`${t('proxy')}: ${entry.name}`}
                          />
                          {t('proxy')}
                        </label>
                      ) : (
                        entry.isProxy && <span className="text-xs">{t('proxy')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}
