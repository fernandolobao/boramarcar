import { getEventRecap } from '@boramarcar/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { ShareButtons } from '@/components/share-buttons';
import { getDb } from '@/server/db';
import { recapUrl } from '@/server/email';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const recap = await getEventRecap(getDb(), eventId).catch(() => null);
  if (!recap) return pageMetadata({ section: 'recap', path: `/resumo/${eventId}` });
  const t = await getTranslations('recap');
  const top = recap.standings[0];
  return pageMetadata({
    section: 'recap',
    path: `/resumo/${eventId}`,
    title: t('metaTitle', { title: recap.title }),
    description:
      top && top.wins > 0
        ? t('summaryTop', { name: top.name, wins: top.wins, count: recap.games.length })
        : t('summary', { count: recap.games.length }),
    image: { url: `/og/resumo/${eventId}`, alt: t('metaTitle', { title: recap.title }) },
  });
}

/**
 * Resumo da noite (8.6), público para quem tem o link: só primeiros nomes, comandantes e o placar.
 * Feito para mandar no grupo do WhatsApp (a prévia do link mostra o cartão do resultado).
 */
export default async function RecapPage({ params }: Props) {
  const { eventId } = await params;
  const recap = await getEventRecap(getDb(), eventId).catch(() => null);
  if (!recap) notFound();
  const [t, tc, format, signedIn] = await Promise.all([
    getTranslations('recap'),
    getTranslations('common'),
    getFormatter(),
    getSessionUser(await headers())
      .then(Boolean)
      .catch(() => false),
  ]);
  const top = recap.standings[0];
  const day = format.dateTime(recap.startsAt, { dateStyle: 'full' });
  const summary =
    top && top.wins > 0
      ? t('summaryTop', { name: top.name, wins: top.wins, count: recap.games.length })
      : t('summary', { count: recap.games.length });

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <Link
        href="/"
        className="self-start rounded focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Logo title={tc('appName')} className="h-7 w-auto text-arcano dark:text-pergaminho" />
      </Link>

      <div className="space-y-2">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
          {t('eyebrow')}
        </p>
        <h1 className="page-title">{recap.title}</h1>
        <p className="muted">{day}</p>
        <p className="text-lg">{summary}</p>
      </div>

      <section className="card space-y-3" aria-labelledby="resumo-placar">
        <h2 id="resumo-placar" className="section-title mb-0">
          {t('standings')}
        </h2>
        <ol className="divide-y divide-line">
          {recap.standings.map((row, i) => (
            <li key={row.name} className="flex items-center gap-3 py-2">
              <span
                aria-hidden="true"
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 && row.wins > 0 ? 'bg-accent text-on-accent' : 'bg-surface-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 font-medium">{row.name}</span>
              <span className="tabular-nums">
                {t('wins', { wins: row.wins, games: row.games })}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3" aria-labelledby="resumo-partidas">
        <h2 id="resumo-partidas" className="section-title mb-0">
          {t('games')}
        </h2>
        <ol className="space-y-4">
          {recap.games.map((game) => (
            <li key={game.number} className="space-y-1">
              <h3 className="font-semibold">
                {t('game', { number: game.number })}
                {game.winners.length === 0 && (
                  <span className="muted font-normal"> · {t('draw')}</span>
                )}
              </h3>
              <ul className="space-y-1 text-sm">
                {game.players.map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center gap-x-2">
                    {p.result === 'win' ? (
                      <span className="text-accent-text">
                        <Icon name="winner" />
                      </span>
                    ) : (
                      <span aria-hidden="true" className="inline-block w-4" />
                    )}
                    <span className={p.result === 'win' ? 'font-semibold' : ''}>{p.name}</span>
                    {p.result === 'win' && <span className="sr-only">({t('winner')})</span>}
                    {p.commanders.length > 0 && (
                      <span className="muted">· {p.commanders.join(' + ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3" aria-labelledby="resumo-compartilhar">
        <h2 id="resumo-compartilhar" className="section-title mb-0">
          {t('share')}
        </h2>
        <ShareButtons
          text={t('shareText', { title: recap.title, summary, url: recapUrl(recap.eventId) })}
          url={recapUrl(recap.eventId)}
          title={recap.title}
        />
      </section>

      {signedIn ? (
        <Link href={`/eventos/${recap.eventId}`} className="btn-secondary self-start">
          <Icon name="events" />
          {t('openEvent')}
        </Link>
      ) : (
        <div className="space-y-2">
          <p>{t('cta')}</p>
          <Link href="/" className="btn-primary">
            {t('ctaButton')}
          </Link>
        </div>
      )}
    </main>
  );
}
