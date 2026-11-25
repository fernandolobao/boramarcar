import { getMonthlyRecap, type MonthlyRecapView } from '@boramarcar/db';
import { PublicTopBar } from '@/components/public-top-bar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/icons';
import { ShareButtons } from '@/components/share-buttons';
import { getDb } from '@/server/db';
import { canSeeMonthlyRecap, monthlyUrl } from '@/server/monthly-link';
import { pageMetadata } from '@/server/seo';
import { getSessionUser } from '@/server/session';

type Props = {
  params: Promise<{ groupId: string; month: string }>;
  searchParams: Promise<{ k?: string }>;
};

/**
 * Só com o código do mês no endereço (`?k=`) ou para quem é do grupo e está logado; senão, a
 * página não existe (nem no título da aba).
 */
async function load(groupId: string, month: string, key: string | undefined) {
  const userId = await getSessionUser(await headers())
    .then((u) => u?.id ?? null)
    .catch(() => null);
  if (!(await canSeeMonthlyRecap(getDb(), { groupId, month, key, userId }))) return null;
  return getMonthlyRecap(getDb(), { groupId, month }).catch(() => null);
}

async function texts(view: MonthlyRecapView) {
  const [t, format] = await Promise.all([getTranslations('monthly'), getFormatter()]);
  const label = format.dateTime(view.from, {
    month: 'long',
    year: 'numeric',
    timeZone: view.timeZone,
  });
  const r = view.recap;
  const summary =
    r.games === 0
      ? t('empty')
      : t('summary', { games: r.games, nights: r.nights, players: r.players.length });
  return { t, format, label, summary };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { groupId, month } = await params;
  const path = `/retrospectiva/${groupId}/${month}`;
  const view = await load(groupId, month, (await searchParams).k);
  if (!view) return pageMetadata({ section: 'recap', path });
  const { t, label, summary } = await texts(view);
  return pageMetadata({
    section: 'recap',
    path,
    title: t('metaTitle', { month: label }),
    description: summary,
  });
}

/**
 * Retrospectiva do mês do grupo (8.12), para quem tem o link com o código do mês (ou é do grupo):
 * só primeiros nomes, títulos dos encontros e números (nada de nome do grupo, local ou e-mail).
 */
export default async function MonthlyRecapPage({ params, searchParams }: Props) {
  const { groupId, month } = await params;
  const view = await load(groupId, month, (await searchParams).k);
  if (!view) notFound();
  const [{ t, format, label, summary }, , signedIn] = await Promise.all([
    texts(view),
    getTranslations('common'),
    getSessionUser(await headers())
      .then(Boolean)
      .catch(() => false),
  ]);
  const r = view.recap;
  const name = (id: string) => view.names[id] ?? t('someone');
  const event = (id: string) => view.eventTitles[id] ?? t('event');
  const broken = new Set(r.recordsBroken);
  const highlights: { key: string; title: string; text: string; record: boolean }[] = [];
  if (r.records.fastestWin) {
    const x = r.records.fastestWin;
    highlights.push({
      key: 'fastestWin',
      title: t('fastestWin'),
      text: t('fastestWinText', {
        who: format.list(x.winnerIds.map(name), { type: 'conjunction' }),
        count: x.winnerIds.length,
        turn: x.turn,
        event: event(x.eventId),
      }),
      record: broken.has('fastestWin'),
    });
  }
  if (r.records.longestGame) {
    const x = r.records.longestGame;
    highlights.push({
      key: 'longestGame',
      title: t('longestGame'),
      text: t('longestGameText', { minutes: x.minutes, event: event(x.eventId) }),
      record: broken.has('longestGame'),
    });
  }
  if (r.records.longestStreak) {
    const x = r.records.longestStreak;
    highlights.push({
      key: 'longestStreak',
      title: t('longestStreak'),
      text: t('longestStreakText', { who: name(x.userId), length: x.length }),
      record: broken.has('longestStreak'),
    });
  }
  if (r.records.busiestNight) {
    const x = r.records.busiestNight;
    highlights.push({
      key: 'busiestNight',
      title: t('busiestNight'),
      text: t('busiestNightText', { games: x.games, event: event(x.eventId) }),
      record: broken.has('busiestNight'),
    });
  }
  if (r.records.topCommander) {
    highlights.push({
      key: 'topCommander',
      title: t('topCommander'),
      text: t('topCommanderText', {
        name: r.records.topCommander.name,
        wins: r.records.topCommander.wins,
      }),
      record: false,
    });
  }
  const url = monthlyUrl(groupId, month);

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 focus:outline-none sm:px-6"
    >
      <PublicTopBar />

      <div className="space-y-2">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
          {t('eyebrow')}
        </p>
        <h1 className="page-title first-letter:uppercase">{label}</h1>
        <p className="text-lg">{summary}</p>
        {r.winner && (
          <p className="flex items-start gap-2 font-medium">
            <span className="mt-1 shrink-0 text-accent-text">
              <Icon name="winner" />
            </span>
            <span>
              {t('winner', {
                name: name(r.winner.userId),
                wins: r.winner.wins,
                games: r.winner.games,
              })}
            </span>
          </p>
        )}
        {r.debuts.length > 0 && (
          <p>{t('debuts', { names: format.list(r.debuts.map(name), { type: 'conjunction' }) })}</p>
        )}
      </div>

      {highlights.length > 0 && (
        <section className="card space-y-3" aria-labelledby="mes-destaques">
          <h2 id="mes-destaques" className="section-title mb-0">
            {t('highlights')}
          </h2>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h.key}>
                <p className="font-semibold">
                  {h.title}
                  {h.record && (
                    <span className="ms-2 inline-flex rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                      {t('newRecord')}
                    </span>
                  )}
                </p>
                <p>{h.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.duel && (
        <section className="card space-y-2" aria-labelledby="mes-duelo">
          <h2 id="mes-duelo" className="section-title mb-0">
            {t('duel')}
          </h2>
          <p>
            {t('duelText', {
              a: name(r.duel.a),
              b: name(r.duel.b),
              aWins: r.duel.aWins,
              bWins: r.duel.bWins,
              games: r.duel.games,
            })}
          </p>
        </section>
      )}

      <section className="card space-y-3" aria-labelledby="mes-compartilhar">
        <h2 id="mes-compartilhar" className="section-title mb-0">
          {t('share')}
        </h2>
        <ShareButtons
          text={t('shareText', { month: label, summary, url })}
          url={url}
          title={t('metaTitle', { month: label })}
        />
      </section>

      {signedIn ? (
        <Link href="/grupo#recordes" className="btn-secondary self-start">
          <Icon name="ranking" />
          {t('openRecords')}
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
