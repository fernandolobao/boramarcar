'use client';

import {
  createTable,
  GAME_FORMATS,
  startingLifeFor,
  tableDurationMinutes,
  tableGamePlayers,
  tableResult,
  tableSupportsFormat,
  type GameFormat,
  type TableState,
} from '@boramarcar/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';
import { TableBoard } from './table-board';
import {
  clearTable,
  enterFullscreen,
  exitFullscreen,
  useFullscreen,
  useKeepAwake,
  useSavedTable,
  useTable,
} from './use-table';
import { KEEP_AWAKE_MP4, KEEP_AWAKE_WEBM } from './keep-awake-media';
import { NumberField } from '../ds/number-field';
import { Choices } from '../ds/choices';
import { TitleWithTip } from '../tip';
import { Select } from '@/components/ds/select';
import { Checkbox } from '@/components/ds/checkbox';

export interface TablePlayerOption {
  userId: string;
  name: string;
  confirmed: boolean;
  decks: { id: string; name: string; commanders?: string[] }[];
}

const MAX_PLAYERS = 6;

/** Mesa de torneio (9.1) aberta no modo mesa: jogadores e formato já definidos. */
export interface TableTournament {
  id: string;
  name: string;
  tableId: string;
  tableNumber: number;
  format: GameFormat;
  /** Pessoas da mesa, na ordem dos assentos. */
  seats: string[];
  /** Inscrição de cada pessoa (o resultado vai por inscrição). */
  entrantOf: Record<string, string>;
}

/** Chave da partida salva no aparelho: a do encontro, ou a da mesa do torneio. */
const storageKeyOf = (eventId: string, tournament?: TableTournament) =>
  tournament ? `${eventId}:${tournament.tableId}` : eventId;

function Setup({
  eventId,
  players,
  defaultFormat,
  showTip,
  onStart,
  tournament,
}: {
  eventId: string;
  players: readonly TablePlayerOption[];
  defaultFormat: GameFormat;
  showTip: boolean;
  onStart: (state: TableState) => void;
  tournament?: TableTournament;
}) {
  const t = useTranslations('table');
  const tf = useTranslations('formats');
  const id = useId();
  const formats = GAME_FORMATS.filter(tableSupportsFormat);
  const [format, setFormat] = useState<GameFormat>(
    tournament && tableSupportsFormat(tournament.format)
      ? tournament.format
      : tableSupportsFormat(defaultFormat)
        ? defaultFormat
        : 'commander',
  );
  const [life, setLife] = useState<number | null>(startingLifeFor(format));
  const [seats, setSeats] = useState<string[]>(
    tournament
      ? tournament.seats
      : players
          .filter((p) => p.confirmed)
          .slice(0, MAX_PLAYERS)
          .map((p) => p.userId),
  );
  const [decks, setDecks] = useState<Record<string, string>>({});
  const storageKey = storageKeyOf(eventId, tournament);
  const saved = useSavedTable(storageKey);

  const toggle = (userId: string) =>
    setSeats((s) =>
      s.includes(userId)
        ? s.filter((x) => x !== userId)
        : s.length < MAX_PLAYERS
          ? [...s, userId]
          : s,
    );
  const move = (index: number, by: number) =>
    setSeats((s) => {
      const next = [...s];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item!);
      return next;
    });
  const byId = new Map(players.map((p) => [p.userId, p]));
  const lifeValue = life ?? 0;
  const valid =
    seats.length >= 2 && Number.isInteger(lifeValue) && lifeValue > 0 && lifeValue <= 999;

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-2xl space-y-6 px-4 py-8 focus:outline-none"
    >
      <TitleWithTip id="table" dismissed={!showTip}>
        <h1 className="page-title">{t('title')}</h1>
        <p className="muted">
          {tournament
            ? t('tournamentIntro', { name: tournament.name, table: tournament.tableNumber })
            : t('intro')}
        </p>
      </TitleWithTip>
      {saved && (
        <section className="card space-y-3" aria-labelledby={`${id}-saved`}>
          <h2 id={`${id}-saved`} className="section-title mb-0">
            {t('savedTitle')}
          </h2>
          <p className="muted text-sm">
            {t('savedHint', { players: saved.players.map((p) => p.name).join(', ') })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                enterFullscreen();
                onStart(saved);
              }}
            >
              <Icon name="play" />
              {t('resume')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => clearTable(storageKey)}>
              <Icon name="delete" />
              {t('discard')}
            </button>
          </div>
        </section>
      )}
      <form
        className="card space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          // Dentro do toque em "Começar": a tela cheia só pode ser pedida por um gesto do usuário.
          enterFullscreen();
          onStart(
            createTable({
              format,
              startingLife: lifeValue,
              players: seats.map((userId) => ({
                userId,
                name: byId.get(userId)!.name,
                deckId: decks[userId] || null,
                commanders:
                  byId.get(userId)!.decks.find((d) => d.id === decks[userId])?.commanders ?? [],
              })),
            }),
          );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Select
              label={t('format')}
              id={`${id}-format`}
              value={String(format)}
              // Na mesa do torneio, o formato é o do torneio.
              disabled={Boolean(tournament)}
              onChange={(v) => {
                const f = v as GameFormat;
                setFormat(f);
                setLife(startingLifeFor(f));
              }}
              options={formats.map((f) => ({ value: String(f), label: tf(f) }))}
            />
          </div>
          <div>
            <NumberField
              id={`${id}-life`}
              label={t('startingLife')}
              value={life}
              onChange={setLife}
              min={1}
              max={999}
            />
          </div>
        </div>

        {/* Na mesa do torneio, quem joga já está definido (só a ordem e os decks mudam). */}
        {!tournament && (
          <fieldset>
            <legend className="label">{t('players', { max: MAX_PLAYERS })}</legend>
            <ul className="grid gap-2 sm:grid-cols-2">
              {players.map((p) => (
                <li key={p.userId}>
                  <Checkbox
                    label={p.name}
                    checked={seats.includes(p.userId)}
                    disabled={!seats.includes(p.userId) && seats.length >= MAX_PLAYERS}
                    onChange={() => toggle(p.userId)}
                    className="min-h-11 rounded-xl border border-line-strong px-3 data-[selected]:border-primary data-[selected]:bg-surface-muted"
                  >
                    {p.confirmed && <span className="muted text-xs">({t('confirmed')})</span>}
                  </Checkbox>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {seats.length > 0 && (
          <section aria-labelledby={`${id}-order`}>
            <h2 id={`${id}-order`} className="label">
              {t('seatOrder')}
            </h2>
            <p className="muted mb-2 text-sm">{t('seatOrderHint')}</p>
            <ol className="space-y-2">
              {seats.map((userId, i) => {
                const p = byId.get(userId)!;
                return (
                  <li
                    key={userId}
                    className="grid gap-2 rounded-xl border border-ink-200 p-3 sm:grid-cols-[1fr_auto] sm:items-end dark:border-ink-800"
                  >
                    <div>
                      <Select
                        label={`${i + 1}. ${p.name} · ${t('deck')}`}
                        id={`${id}-deck-${userId}`}
                        value={String(decks[userId] ?? '')}
                        onChange={(v) => setDecks((d) => ({ ...d, [userId]: v }))}
                        options={[
                          { value: '', label: t('noDeck') },
                          ...p.decks.map((d) => ({ value: String(d.id), label: d.name })),
                        ]}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={t('moveUp', { name: p.name })}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={i === seats.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={t('moveDown', { name: p.name })}
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={!valid}>
            <Icon name="play" />
            {t('start')}
          </button>
          <Link
            href={tournament ? `/torneios/${tournament.id}` : `/eventos/${eventId}`}
            className="btn-secondary"
          >
            <Icon name="previous" />
            {tournament ? t('backToTournament') : t('back')}
          </Link>
        </div>
        {seats.length < 2 && <p className="muted text-sm">{t('needTwo')}</p>}
      </form>
    </main>
  );
}

function Finish({
  eventId,
  state,
  onBack,
  tournament,
}: {
  eventId: string;
  state: TableState;
  onBack: () => void;
  tournament?: TableTournament;
}) {
  const t = useTranslations('table');
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const result = tableResult(state);
  const [winner, setWinner] = useState<string>(result.winnerId ?? '');
  const [first, setFirst] = useState(state.firstPlayerId ?? '');
  const [turn, setTurn] = useState<number | null>(null);
  const order = new Map(result.eliminated.map((e) => [e.userId, e.order]));

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-2xl space-y-6 px-4 py-8 focus:outline-none"
    >
      <h1 className="page-title">{t('finishTitle')}</h1>
      <form
        className="card space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const details = {
            firstPlayerId: first || null,
            winningTurn: turn,
            durationMinutes: tableDurationMinutes(state),
          };
          void run(
            () =>
              tournament
                ? // Mesa de torneio: o resultado vai para a mesa (e de lá vira partida do grupo).
                  api(`/api/v1/tournaments/${tournament.id}/tables/${tournament.tableId}`, {
                    method: 'PUT',
                    body: {
                      gameWins: winner === 'draw' ? {} : { [tournament.entrantOf[winner]!]: 1 },
                      gameDraws: winner === 'draw' ? 1 : 0,
                      details,
                    },
                  })
                : api(`/api/v1/events/${eventId}/games`, {
                    method: 'POST',
                    body: {
                      format: state.format,
                      ...details,
                      players: tableGamePlayers(state, winner === 'draw' ? null : winner),
                    },
                  }),
            () => {
              clearTable(storageKeyOf(eventId, tournament));
              router.push(tournament ? `/torneios/${tournament.id}` : `/eventos/${eventId}`);
            },
          );
        }}
      >
        <Choices
          label={t('winner')}
          description={t('winnerHint')}
          variant="cards"
          orientation="vertical"
          value={winner || null}
          onChange={setWinner}
          options={[
            ...state.players.map((p) => ({
              value: p.userId,
              label: p.name,
              description: [
                t('lifeShort', { life: p.life }),
                order.has(p.userId) ? t('outOrder', { order: order.get(p.userId)! }) : null,
              ]
                .filter(Boolean)
                .join(' · '),
            })),
            { value: 'draw', label: t('draw') },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Select
              label={t('firstPlayer')}
              id={`${id}-first`}
              value={String(first)}
              onChange={(v) => setFirst(v)}
              options={[
                { value: '', label: t('unknown') },
                ...state.players.map((p) => ({ value: String(p.userId), label: p.name })),
              ]}
            />
          </div>
          <div>
            <NumberField
              id={`${id}-turn`}
              label={t('winningTurn')}
              value={turn}
              onChange={setTurn}
              min={1}
              max={99}
            />
          </div>
        </div>
        <p className="muted text-sm">{t('duration', { minutes: tableDurationMinutes(state) })}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending || !winner}>
            <Icon name="save" />
            {t('save')}
          </button>
          <button type="button" className="btn-secondary" onClick={onBack}>
            <Icon name="previous" />
            {t('backToTable')}
          </button>
        </div>
        <FormError message={error} />
      </form>
    </main>
  );
}

function Playing({
  eventId,
  initial,
  onFinish,
  onExit,
}: {
  eventId: string;
  initial: TableState;
  onFinish: (state: TableState) => void;
  onExit: () => void;
}) {
  const [state, dispatch] = useTable(eventId, initial);
  const { status: awake, videoRef } = useKeepAwake(true);
  const fullscreen = useFullscreen();
  // Ao sair do tabuleiro (registrar ou voltar), a página volta ao normal.
  useEffect(() => exitFullscreen, []);
  return (
    <>
      <TableBoard
        state={state}
        dispatch={dispatch}
        onFinish={() => onFinish(state)}
        onExit={onExit}
        screen={{ awake, fullscreen }}
      />
      {/* Vídeo mudo de poucos pixels, só para a tela não bloquear onde não há wake lock. */}
      <video
        ref={videoRef}
        className="pointer-events-none fixed bottom-0 left-0 size-px opacity-0"
        muted
        loop
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={KEEP_AWAKE_WEBM} type="video/webm" />
        <source src={KEEP_AWAKE_MP4} type="video/mp4" />
      </video>
    </>
  );
}

/** Modo mesa (5.6): configurar, jogar com o contador e registrar o resultado no encontro. */
export function TableMode({
  eventId,
  players,
  defaultFormat,
  showTip = false,
  tournament,
}: {
  eventId: string;
  players: readonly TablePlayerOption[];
  defaultFormat: GameFormat;
  /** Dica do modo mesa (7.4), enquanto a pessoa não a dispensar. */
  showTip?: boolean;
  /** Mesa de torneio (9.1): jogadores e formato já definidos; o resultado vai para a mesa. */
  tournament?: TableTournament;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<
    | { kind: 'setup' }
    | { kind: 'playing'; state: TableState }
    | { kind: 'finish'; state: TableState }
  >({ kind: 'setup' });

  if (phase.kind === 'playing') {
    return (
      <Playing
        eventId={storageKeyOf(eventId, tournament)}
        initial={phase.state}
        onFinish={(state) => setPhase({ kind: 'finish', state })}
        onExit={() =>
          router.push(tournament ? `/torneios/${tournament.id}` : `/eventos/${eventId}`)
        }
      />
    );
  }
  if (phase.kind === 'finish') {
    return (
      <Finish
        eventId={eventId}
        tournament={tournament}
        state={phase.state}
        onBack={() => setPhase({ kind: 'playing', state: phase.state })}
      />
    );
  }
  return (
    <Setup
      eventId={eventId}
      players={players}
      defaultFormat={defaultFormat}
      showTip={showTip}
      tournament={tournament}
      onStart={(state) => setPhase({ kind: 'playing', state })}
    />
  );
}
