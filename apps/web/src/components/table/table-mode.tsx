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
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';
import { TableBoard } from './table-board';
import { clearTable, useSavedTable, useTable, useWakeLock } from './use-table';

export interface TablePlayerOption {
  userId: string;
  name: string;
  confirmed: boolean;
  decks: { id: string; name: string }[];
}

const MAX_PLAYERS = 6;

function Setup({
  eventId,
  players,
  defaultFormat,
  onStart,
}: {
  eventId: string;
  players: readonly TablePlayerOption[];
  defaultFormat: GameFormat;
  onStart: (state: TableState) => void;
}) {
  const t = useTranslations('table');
  const tf = useTranslations('formats');
  const id = useId();
  const formats = GAME_FORMATS.filter(tableSupportsFormat);
  const [format, setFormat] = useState<GameFormat>(
    tableSupportsFormat(defaultFormat) ? defaultFormat : 'commander',
  );
  const [life, setLife] = useState(String(startingLifeFor(format)));
  const [seats, setSeats] = useState<string[]>(
    players
      .filter((p) => p.confirmed)
      .slice(0, MAX_PLAYERS)
      .map((p) => p.userId),
  );
  const [decks, setDecks] = useState<Record<string, string>>({});
  const saved = useSavedTable(eventId);

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
  const lifeValue = Number(life);
  const valid =
    seats.length >= 2 && Number.isInteger(lifeValue) && lifeValue > 0 && lifeValue <= 999;

  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto max-w-2xl space-y-6 px-4 py-8 focus:outline-none"
    >
      <h1 className="page-title">{t('title')}</h1>
      <p className="muted">{t('intro')}</p>
      {saved && (
        <section className="card space-y-3" aria-labelledby={`${id}-saved`}>
          <h2 id={`${id}-saved`} className="section-title mb-0">
            {t('savedTitle')}
          </h2>
          <p className="muted text-sm">
            {t('savedHint', { players: saved.players.map((p) => p.name).join(', ') })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => onStart(saved)}>
              <Icon name="play" />
              {t('resume')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => clearTable(eventId)}>
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
          onStart(
            createTable({
              format,
              startingLife: lifeValue,
              players: seats.map((userId) => ({
                userId,
                name: byId.get(userId)!.name,
                deckId: decks[userId] || null,
              })),
            }),
          );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${id}-format`}>
              {t('format')}
            </label>
            <select
              id={`${id}-format`}
              className="select"
              value={format}
              onChange={(e) => {
                const f = e.target.value as GameFormat;
                setFormat(f);
                setLife(String(startingLifeFor(f)));
              }}
            >
              {formats.map((f) => (
                <option key={f} value={f}>
                  {tf(f)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-life`}>
              {t('startingLife')}
            </label>
            <input
              id={`${id}-life`}
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              required
              value={life}
              onChange={(e) => setLife(e.target.value)}
            />
          </div>
        </div>

        <fieldset>
          <legend className="label">{t('players', { max: MAX_PLAYERS })}</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {players.map((p) => (
              <li key={p.userId}>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-300 px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-700/20">
                  <input
                    type="checkbox"
                    checked={seats.includes(p.userId)}
                    disabled={!seats.includes(p.userId) && seats.length >= MAX_PLAYERS}
                    onChange={() => toggle(p.userId)}
                  />
                  {p.name}
                  {p.confirmed && <span className="muted text-xs">({t('confirmed')})</span>}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

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
                      <label className="label" htmlFor={`${id}-deck-${userId}`}>
                        {i + 1}. {p.name} · {t('deck')}
                      </label>
                      <select
                        id={`${id}-deck-${userId}`}
                        className="select"
                        value={decks[userId] ?? ''}
                        onChange={(e) => setDecks((d) => ({ ...d, [userId]: e.target.value }))}
                      >
                        <option value="">{t('noDeck')}</option>
                        {p.decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
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
          <Link href={`/eventos/${eventId}`} className="btn-secondary">
            <Icon name="previous" />
            {t('back')}
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
}: {
  eventId: string;
  state: TableState;
  onBack: () => void;
}) {
  const t = useTranslations('table');
  const router = useRouter();
  const id = useId();
  const { run, error, pending } = useApiAction();
  const result = tableResult(state);
  const [winner, setWinner] = useState<string>(result.winnerId ?? '');
  const [first, setFirst] = useState(state.firstPlayerId ?? '');
  const [turn, setTurn] = useState('');
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
          void run(
            () =>
              api(`/api/v1/events/${eventId}/games`, {
                method: 'POST',
                body: {
                  format: state.format,
                  firstPlayerId: first || null,
                  winningTurn: turn ? Number(turn) : null,
                  durationMinutes: tableDurationMinutes(state),
                  players: tableGamePlayers(state, winner === 'draw' ? null : winner),
                },
              }),
            () => {
              clearTable(eventId);
              router.push(`/eventos/${eventId}`);
            },
          );
        }}
      >
        <fieldset>
          <legend className="label">{t('winner')}</legend>
          <p className="muted mb-2 text-sm">{t('winnerHint')}</p>
          <ul className="space-y-2">
            {state.players.map((p) => (
              <li key={p.userId}>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-300 px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-700/20">
                  <input
                    type="radio"
                    name={`${id}-winner`}
                    required
                    checked={winner === p.userId}
                    onChange={() => setWinner(p.userId)}
                  />
                  <span className="font-medium">{p.name}</span>
                  <span className="muted">
                    · {t('lifeShort', { life: p.life })}
                    {order.has(p.userId) && ` · ${t('outOrder', { order: order.get(p.userId)! })}`}
                  </span>
                </label>
              </li>
            ))}
            <li>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-300 px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-700/20">
                <input
                  type="radio"
                  name={`${id}-winner`}
                  checked={winner === 'draw'}
                  onChange={() => setWinner('draw')}
                />
                {t('draw')}
              </label>
            </li>
          </ul>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${id}-first`}>
              {t('firstPlayer')}
            </label>
            <select
              id={`${id}-first`}
              className="select"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            >
              <option value="">{t('unknown')}</option>
              {state.players.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-turn`}>
              {t('winningTurn')}
            </label>
            <input
              id={`${id}-turn`}
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={turn}
              onChange={(e) => setTurn(e.target.value)}
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
  useWakeLock(true);
  return (
    <TableBoard
      state={state}
      dispatch={dispatch}
      onFinish={() => onFinish(state)}
      onExit={onExit}
    />
  );
}

/** Modo mesa (5.6): configurar, jogar com o contador e registrar o resultado no encontro. */
export function TableMode({
  eventId,
  players,
  defaultFormat,
}: {
  eventId: string;
  players: readonly TablePlayerOption[];
  defaultFormat: GameFormat;
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
        eventId={eventId}
        initial={phase.state}
        onFinish={(state) => setPhase({ kind: 'finish', state })}
        onExit={() => router.push(`/eventos/${eventId}`)}
      />
    );
  }
  if (phase.kind === 'finish') {
    return (
      <Finish
        eventId={eventId}
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
      onStart={(state) => setPhase({ kind: 'playing', state })}
    />
  );
}
