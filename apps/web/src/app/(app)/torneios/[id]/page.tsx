import { getTournament, listMembers } from '@boramarcar/db';
import { isDomainError, isGameFormat } from '@boramarcar/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { StackSections } from '@/components/stack-sections';
import {
  TableResultForm,
  TournamentControls,
  TournamentEntrants,
} from '@/components/tournaments/tournament-actions';
import { requireUser } from '@/server/current-user';
import { getDb } from '@/server/db';
import { pageMetadata } from '@/server/seo';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const user = await requireUser();
  const view = await getTournament(getDb(), { tournamentId: id, userId: user.id }).catch(
    (error: unknown) => {
      if (isDomainError(error) && (error.code === 'not_found' || error.code === 'forbidden'))
        notFound();
      throw error;
    },
  );
  return { user, view };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { view } = await load(id);
  const [t, tf] = await Promise.all([getTranslations('tournaments'), getTranslations('formats')]);
  return pageMetadata({
    section: 'group',
    path: `/torneios/${id}`,
    title: view.tournament.name,
    description: `${tf(isGameFormat(view.tournament.format) ? view.tournament.format : 'other')} · ${t(`status.${view.tournament.status as 'running'}`)} · ${t('entrantsCount', { count: view.entrants.length })}`,
  });
}

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

/** Página do torneio (9.1): inscrições, rodadas e mesas, classificação e linha do tempo. */
export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  const { user, view } = await load(id);
  const db = getDb();
  const [members, t, tf, format] = await Promise.all([
    listMembers(db, view.tournament.groupId),
    getTranslations('tournaments'),
    getTranslations('formats'),
    getFormatter(),
  ]);
  const tour = view.tournament;
  const nameOf = new Map(view.entrants.map((e) => [e.id, e.name]));
  const entrantName = (eid: string) => nameOf.get(eid) ?? '—';
  const current = view.rounds.at(-1);
  const canAdvance = Boolean(current?.tables.every((table) => table.reported));
  const bestOfLabel = t('bestOfOption', { count: tour.bestOf });

  /** Resultado da mesa em texto: no pod, quem venceu (ou empate); no par, o placar em jogos. */
  const resultText = (
    table: { gameWins: Record<string, number>; gameDraws: number },
    seated: { id: string; name: string }[],
  ) => {
    if (tour.table === 'pod') {
      const winner = seated.find((x) => (table.gameWins[x.id] ?? 0) > 0);
      return winner ? t('podWinner', { name: winner.name }) : t('draw');
    }
    const line = seated
      .map((x) => t('resultLine', { name: x.name, wins: table.gameWins[x.id] ?? 0 }))
      .join(' · ');
    return table.gameDraws > 0 ? `${line} · ${t('draw')}: ${table.gameDraws}` : line;
  };

  const timelineText = (kind: string, data: Record<string, unknown>) => {
    switch (kind) {
      case 'started':
        return t('events.started', {
          entrants: Number(data.entrants ?? 0),
          rounds: Number(data.rounds ?? 0),
        });
      case 'round_started':
        return t('events.round_started', { round: Number(data.round ?? 0) });
      case 'table_reported':
        return t(data.corrected ? 'events.table_corrected' : 'events.table_reported', {
          round: Number(data.round ?? 0),
          table: Number(data.table ?? 0),
        });
      case 'finished': {
        const champions = (Array.isArray(data.champions) ? data.champions : []).map((c) =>
          entrantName(String(c)),
        );
        return t('events.finished', {
          champions: champions.length ? format.list(champions, { type: 'conjunction' }) : 'none',
        });
      }
      default:
        return kind;
    }
  };

  return (
    <>
      <div className="space-y-1">
        <h1 className="page-title">{tour.name}</h1>
        <p className="muted">
          {t('summary', {
            format: tf(isGameFormat(tour.format) ? tour.format : 'other'),
            bestOf: bestOfLabel,
            event: view.event?.title ?? '',
          })}{' '}
          ·{' '}
          <Link href={`/eventos/${tour.eventId}`} className="underline underline-offset-2">
            {view.event ? format.dateTime(view.event.startsAt, { dateStyle: 'medium' }) : ''}
          </Link>
        </p>
        <p>
          <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-sm font-medium">
            {t(`status.${tour.status as 'registration' | 'running' | 'finished'}`)}
          </span>
        </p>
      </div>

      <StackSections>
        {tour.status === 'registration' && (
          <section className="card" aria-labelledby="torneio-inscricoes">
            <h2 id="torneio-inscricoes" className="section-title">
              {t('entrants')} · {t('entrantsCount', { count: view.entrants.length })}
            </h2>
            <TournamentEntrants
              tournamentId={tour.id}
              entrantSize={tour.entrantSize}
              entrants={view.entrants}
              members={members.map((m) => ({ userId: m.userId, name: m.name }))}
              me={user.id}
              canManage={view.canManage}
            />
          </section>
        )}

        {[...view.rounds].reverse().map((round, index) => (
          <section
            key={round.id}
            className="card space-y-4"
            aria-labelledby={`torneio-rodada-${round.number}`}
          >
            <h2 id={`torneio-rodada-${round.number}`} className="section-title mb-0">
              {t('roundOf', { number: round.number, total: tour.rounds ?? round.number })}
            </h2>
            <ol className="grid gap-4 md:grid-cols-2">
              {round.tables.map((table) => {
                const seated = table.entrants.map((eid) => ({
                  id: eid,
                  name: entrantName(eid),
                  memberIds: view.entrants.find((e) => e.id === eid)?.memberIds ?? [],
                }));
                if (seated.length === 1) {
                  return (
                    <li key={table.id} className="rounded-xl bg-surface-muted p-3 text-sm">
                      {t('bye', { name: seated[0]!.name })}
                    </li>
                  );
                }
                const atTable = seated.some((s) => s.memberIds.includes(user.id));
                const canReport =
                  tour.status === 'running' &&
                  (view.canManage || (atTable && !table.reported)) &&
                  index === 0;
                return (
                  <li key={table.id} className="space-y-2 rounded-xl border border-line p-3">
                    <h3 className="font-semibold">{t('table', { number: table.number })}</h3>
                    <ol className="list-inside list-decimal text-sm">
                      {seated.map((s) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ol>
                    {/* Região de status: ao registrar, "Aguardando…" vira o resultado e é anunciado. */}
                    <p
                      role="status"
                      className={table.reported ? 'text-sm font-medium' : 'muted text-sm'}
                    >
                      {table.reported
                        ? `${t('result')}: ${resultText(table, seated)}`
                        : t('waiting')}
                    </p>
                    {canReport &&
                      (table.reported ? (
                        // Já registrada: a correção (de quem organiza) fica recolhida.
                        <details className="rounded-lg border border-line px-3 py-2">
                          <summary className="cursor-pointer py-1 text-sm font-medium">
                            {t('correct')}
                            <span className="sr-only">
                              {' '}
                              ({t('table', { number: table.number })})
                            </span>
                          </summary>
                          <div className="mt-2">
                            <TableResultForm
                              tournamentId={tour.id}
                              table={{ id: table.id, number: table.number }}
                              entrants={seated}
                              kind={tour.table}
                              bestOf={tour.bestOf}
                              initial={{ gameWins: table.gameWins, gameDraws: table.gameDraws }}
                              reported={table.reported}
                            />
                          </div>
                        </details>
                      ) : (
                        <TableResultForm
                          tournamentId={tour.id}
                          table={{ id: table.id, number: table.number }}
                          entrants={seated}
                          kind={tour.table}
                          bestOf={tour.bestOf}
                          initial={{ gameWins: table.gameWins, gameDraws: table.gameDraws }}
                          reported={table.reported}
                        />
                      ))}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        {tour.status !== 'registration' && (
          <section className="card space-y-3" aria-labelledby="torneio-classificacao">
            <h2 id="torneio-classificacao" className="section-title mb-0">
              {t('standings')}
            </h2>
            {/* Rolável no celular: com nome e alcançável pelo teclado, como no ranking. */}
            <div
              role="region"
              aria-label={t('standings')}
              tabIndex={0}
              className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-focus"
            >
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-start">
                    <th scope="col" className="py-1 pe-2 text-start">
                      {t('rank')}
                    </th>
                    <th scope="col" className="py-1 pe-2 text-start">
                      {t('player')}
                    </th>
                    <th scope="col" className="py-1 pe-2 text-end">
                      {t('pts')}
                    </th>
                    <th scope="col" className="py-1 pe-2 text-end">
                      {t('record')}
                    </th>
                    <th scope="col" className="py-1 pe-2 text-end">
                      {t('omw')}
                    </th>
                    <th scope="col" className="py-1 pe-2 text-end">
                      {t('gw')}
                    </th>
                    <th scope="col" className="py-1 text-end">
                      {t('ogw')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {view.standings.map((s) => (
                    <tr key={s.entrant}>
                      <td className="py-1 pe-2">{s.rank}</td>
                      <th scope="row" className="py-1 pe-2 text-start font-medium">
                        {entrantName(s.entrant)}
                      </th>
                      <td className="py-1 pe-2 text-end font-semibold">{s.points}</td>
                      <td className="py-1 pe-2 text-end">
                        {s.wins + s.byes}-{s.draws}-{s.losses}
                      </td>
                      <td className="py-1 pe-2 text-end">{percent(s.omw)}</td>
                      <td className="py-1 pe-2 text-end">{percent(s.gw)}</td>
                      <td className="py-1 text-end">{percent(s.ogw)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted text-sm">{t('tiebreakers')}</p>
          </section>
        )}

        {view.timeline.length > 0 && (
          <section className="card space-y-3" aria-labelledby="torneio-linha">
            <h2 id="torneio-linha" className="section-title mb-0">
              {t('timeline')}
            </h2>
            <ol className="space-y-1 text-sm">
              {[...view.timeline].reverse().map((item, i) => (
                <li key={i} className="grid grid-cols-[auto_1fr] gap-x-2">
                  <time className="muted tabular-nums" dateTime={item.createdAt.toISOString()}>
                    {format.dateTime(item.createdAt, { timeStyle: 'short' })}
                  </time>
                  <span>{timelineText(item.kind, item.data)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {view.canManage && tour.status !== 'finished' && (
          <section className="card" aria-labelledby="torneio-organizacao">
            <h2 id="torneio-organizacao" className="section-title">
              {t('manage')}
            </h2>
            <TournamentControls
              tournamentId={tour.id}
              status={tour.status}
              canStart={view.entrants.length >= 2}
              canAdvance={canAdvance}
              lastRound={(current?.number ?? 0) >= (tour.rounds ?? Infinity)}
            />
          </section>
        )}
      </StackSections>
    </>
  );
}
