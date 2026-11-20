import type { TournamentView } from '@boramarcar/db';
import { tableModeEligible } from '@boramarcar/core/tournaments';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Icon } from '../icons';
import { TableResultForm, TournamentControls } from './tournament-actions';

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

/**
 * Rodadas e mesas (com o resultado e o formulário para quem pode registrar), classificação com
 * desempates, linha do tempo e os controles de quem organiza. Usado no torneio do grupo e no
 * torneio do evento de loja (10.2b), onde qualquer pessoa acompanha (`viewerId` pode ser `null`).
 */
export async function TournamentLive({
  view,
  viewerId,
  tableMode,
  deletable = true,
}: {
  view: TournamentView;
  viewerId: string | null;
  /** Mostra "Abrir no modo mesa" (só no torneio do grupo, que tem encontro). */
  tableMode: boolean;
  deletable?: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations('tournaments'), getFormatter()]);
  const tour = view.tournament;
  const nameOf = new Map(view.entrants.map((e) => [e.id, e.name]));
  const entrantName = (eid: string) => nameOf.get(eid) ?? '—';
  const current = view.rounds.at(-1);

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
      case 'started': {
        if (String(data.structure) === 'double_elimination') {
          return `${t('events.started_no_rounds', { entrants: Number(data.entrants ?? 0) })} ${t('events.started_structure', { structure: t('structure.double_elimination') })}`;
        }
        const started = t('events.started', {
          entrants: Number(data.entrants ?? 0),
          rounds: Number(data.rounds ?? 0),
        });
        const structure = String(data.structure ?? 'swiss');
        const withStructure =
          structure !== 'swiss'
            ? `${started} ${t('events.started_structure', { structure: t(`structure.${structure as 'round_robin'}`) })}`
            : started;
        return data.topCut
          ? `${withStructure} ${t('events.started_top', { size: Number(data.topCut) })}`
          : withStructure;
      }
      case 'round_started': {
        if (data.stage !== 'top') {
          return t('events.round_started', { round: Number(data.round ?? 0) });
        }
        const stageName = view.rounds.find((r) => r.number === Number(data.round))?.stageName;
        if (tour.structure === 'double_elimination') {
          return t('events.round_started', { round: Number(data.round ?? 0) });
        }
        if (tour.structure === 'single_elimination') {
          return stageName
            ? t('events.elimination_round', { stage: t(`stage.${stageName}`) })
            : t('events.round_started', { round: Number(data.round ?? 0) });
        }
        return t('events.top_round', { stage: t(`stage.${stageName ?? 'final'}`) });
      }
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
      {view.champion && (
        <p className="card flex items-center gap-2 text-lg font-semibold" role="status">
          <Icon name="winner" />
          {t('champion', { name: entrantName(view.champion) })}
        </p>
      )}
      {[...view.rounds].reverse().map((round, index) => (
        <section
          key={round.id}
          className="card space-y-4"
          aria-labelledby={`torneio-rodada-${round.number}`}
        >
          <h2 id={`torneio-rodada-${round.number}`} className="section-title mb-0">
            {tour.structure === 'double_elimination'
              ? round.tables.some((x) => x.bracket === 'final')
                ? t('bracket.final')
                : t('roundSimple', { number: round.number })
              : round.stageName && tour.structure === 'single_elimination'
                ? t(`stage.${round.stageName}`)
                : round.stageName && tour.topCut
                  ? t('stageHeading', { size: tour.topCut, stage: t(`stage.${round.stageName}`) })
                  : t('roundOf', { number: round.number, total: tour.rounds ?? round.number })}
          </h2>
          <ol className="grid items-start gap-4 md:grid-cols-2">
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
              const atTable =
                viewerId !== null && seated.some((s) => s.memberIds.includes(viewerId));
              const canReport =
                tour.status === 'running' &&
                (view.canManage || (atTable && !table.reported)) &&
                index === 0;
              return (
                <li key={table.id} className="space-y-2 rounded-xl border border-line p-3">
                  <h3 className="font-semibold">
                    {t('table', { number: table.number })}
                    {/* Eliminação dupla: de qual chave é a mesa. */}
                    {table.bracket && table.bracket !== 'final' && (
                      <span className="muted font-normal"> · {t(`bracket.${table.bracket}`)}</span>
                    )}
                  </h3>
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
                    {table.reported ? `${t('result')}: ${resultText(table, seated)}` : t('waiting')}
                  </p>
                  {/* Modo mesa (pod ou melhor de 1): jogadores já na mesa; o resultado volta para cá. */}
                  {tableMode && canReport && tableModeEligible(tour, table) && (
                    <div className="space-y-1">
                      <Link
                        href={`/mesa/${tour.eventId}?torneio=${tour.id}&mesa=${table.id}`}
                        className="btn-primary"
                      >
                        <Icon name="table" />
                        {t('openInTable')}
                        <span className="sr-only"> ({t('table', { number: table.number })})</span>
                      </Link>
                      <p className="muted text-sm">{t('openInTableHint')}</p>
                    </div>
                  )}
                  {canReport &&
                    (table.reported ? (
                      // Já registrada: a correção (de quem organiza) fica recolhida.
                      <details className="rounded-lg border border-line px-3 py-2">
                        <summary className="cursor-pointer py-1 text-sm font-medium">
                          {t('correct')}
                          <span className="sr-only"> ({t('table', { number: table.number })})</span>
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

      {/* Na eliminação simples, a chave decide (classificação por pontos não faz sentido). */}
      {tour.status !== 'registration' &&
        tour.structure !== 'single_elimination' &&
        tour.structure !== 'double_elimination' && (
          <section className="card space-y-3" aria-labelledby="torneio-classificacao">
            <h2 id="torneio-classificacao" className="section-title mb-0">
              {tour.topCut ? t('standingsSwiss') : t('standings')}
            </h2>
            {/* Rolável no celular: com nome e alcançável pelo teclado, como no ranking. */}
            <div
              role="region"
              aria-label={tour.topCut ? t('standingsSwiss') : t('standings')}
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco pelo teclado
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
            nextStep={view.nextStep}
            topCut={tour.topCut}
            inTopCut={current?.stage === 'top'}
            deletable={deletable}
          />
        </section>
      )}
    </>
  );
}
