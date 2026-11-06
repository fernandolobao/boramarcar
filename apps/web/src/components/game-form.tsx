'use client';

import { FORMAT_RULES, GAME_FORMATS, type GameFormat, type GameResult } from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { FormError, useApiAction } from './use-api-action';
import { Icon } from './icons';

export interface GamePlayerOption {
  userId: string;
  name: string;
  decks: { id: string; name: string }[];
}

export interface GameInitial {
  format: GameFormat;
  firstPlayerId: string | null;
  winningTurn: number | null;
  durationMinutes: number | null;
  notes: string | null;
  players: {
    userId: string;
    result: GameResult;
    deckId: string | null;
    team: number | null;
    eliminatedOrder: number | null;
  }[];
}

type Props = {
  players: GamePlayerOption[];
  defaultFormat: GameFormat;
  /** Registrar nova partida neste encontro… */
  eventId?: string;
  /** …ou editar uma partida existente. */
  gameId?: string;
  initial?: GameInitial;
  onSaved?: () => void;
};

const toNumber = (value: string) => (value === '' ? null : Number(value));

/**
 * Formulário de partida (registrar ou editar). As regras mudam com o tipo de jogo:
 * todos contra todos (um vencedor), duelo (2 jogadores) ou times (vence o time).
 */
export function GameForm({ players, defaultFormat, eventId, gameId, initial, onSaved }: Props) {
  const t = useTranslations('events');
  const tf = useTranslations('formats');
  const id = useId();
  const { run, error, pending } = useApiAction();

  const [format, setFormat] = useState<GameFormat>(initial?.format ?? defaultFormat);
  const rules = FORMAT_RULES[format];
  const [playing, setPlaying] = useState<string[]>(
    initial?.players.map((p) => p.userId) ??
      players.slice(0, rules.defaultTableSize).map((p) => p.userId),
  );
  const initialWinner = initial?.players.find((p) => p.result === 'win');
  const [winner, setWinner] = useState(initialWinner?.userId ?? '');
  const [winningTeam, setWinningTeam] = useState<number | null>(initialWinner?.team ?? null);
  const [isDraw, setIsDraw] = useState(
    initial ? initial.players.every((p) => p.result !== 'win') : false,
  );
  const [teamBy, setTeamBy] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initial?.players.filter((p) => p.team).map((p) => [p.userId, p.team!]) ??
        players.slice(0, 4).map((p, i) => [p.userId, (i % 2) + 1]),
    ),
  );
  const [deckBy, setDeckBy] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial?.players.map((p) => [p.userId, p.deckId ?? '']) ?? []),
  );
  const [eliminatedBy, setEliminatedBy] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initial?.players.map((p) => [p.userId, p.eliminatedOrder?.toString() ?? '']) ?? [],
    ),
  );
  const [firstPlayerId, setFirstPlayerId] = useState(initial?.firstPlayerId ?? '');
  const [winningTurn, setWinningTurn] = useState(initial?.winningTurn?.toString() ?? '');
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saved, setSaved] = useState(false);

  const isTeams = rules.structure === 'teams';
  const teamCount = isTeams ? Math.max(2, Math.round(rules.maxPlayers / (rules.teamSize ?? 2))) : 0;
  const ordered = playing
    .map((userId) => players.find((p) => p.userId === userId))
    .filter((p): p is GamePlayerOption => Boolean(p));
  const countOk = playing.length >= rules.minPlayers && playing.length <= rules.maxPlayers;
  const resultOk = isDraw || (isTeams ? winningTeam !== null : playing.includes(winner));

  const payload = useMemo(
    () => ({
      format,
      firstPlayerId: playing.includes(firstPlayerId) ? firstPlayerId : null,
      winningTurn: toNumber(winningTurn),
      durationMinutes: toNumber(duration),
      notes: notes || null,
      players: playing.map((userId, index) => {
        const team = isTeams ? (teamBy[userId] ?? 1) : null;
        const result: GameResult = isDraw
          ? 'draw'
          : isTeams
            ? team === winningTeam
              ? 'win'
              : 'loss'
            : userId === winner
              ? 'win'
              : 'loss';
        return {
          userId,
          seat: index + 1,
          team,
          result,
          deckId: deckBy[userId] || null,
          eliminatedOrder: result === 'win' ? null : toNumber(eliminatedBy[userId] ?? ''),
        };
      }),
    }),
    [
      format,
      playing,
      firstPlayerId,
      winningTurn,
      duration,
      notes,
      isTeams,
      teamBy,
      isDraw,
      winningTeam,
      winner,
      deckBy,
      eliminatedBy,
    ],
  );

  function changeFormat(next: GameFormat) {
    const nextRules = FORMAT_RULES[next];
    setFormat(next);
    setSaved(false);
    // Ajusta a seleção ao novo número de jogadores, sem perder quem já estava marcado.
    setPlaying((prev) => {
      const base = prev.length ? prev : players.map((p) => p.userId);
      const filled = [
        ...base,
        ...players.map((p) => p.userId).filter((u) => !base.includes(u)),
      ].slice(0, Math.max(nextRules.minPlayers, Math.min(base.length, nextRules.maxPlayers)));
      if (nextRules.structure === 'teams') {
        setTeamBy(Object.fromEntries(filled.map((u, i) => [u, (i % 2) + 1])));
      }
      return filled;
    });
  }

  const showElimination = !isTeams && playing.length >= 3;
  const countHint =
    rules.minPlayers === rules.maxPlayers
      ? t('playersExact', { min: rules.minPlayers, count: playing.length })
      : t('playersRange', { min: rules.minPlayers, max: rules.maxPlayers, count: playing.length });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(
          () =>
            gameId
              ? api(`/api/v1/games/${gameId}`, { method: 'PUT', body: payload })
              : api(`/api/v1/events/${eventId}/games`, { method: 'POST', body: payload }),
          () => {
            setSaved(true);
            if (!gameId) {
              setWinner('');
              setWinningTeam(null);
              setIsDraw(false);
              setNotes('');
              setWinningTurn('');
              setDuration('');
              setEliminatedBy({});
              setFirstPlayerId('');
            }
            onSaved?.();
          },
        );
      }}
    >
      <div className="max-w-xs">
        <label className="label" htmlFor={`${id}-format`}>
          {t('format')}
        </label>
        <select
          id={`${id}-format`}
          className="select"
          value={format}
          onChange={(e) => changeFormat(e.target.value as GameFormat)}
        >
          {GAME_FORMATS.map((f) => (
            <option key={f} value={f}>
              {tf(f)}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">{t('playing')}</legend>
        <p
          id={`${id}-count`}
          className={`text-sm ${countOk ? 'muted' : 'font-medium text-amber-800 dark:text-amber-300'}`}
        >
          {countHint}
        </p>
        <ul className="mt-2 divide-y divide-zinc-200 rounded-xl border border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
          {players.map((player) => {
            const isPlaying = playing.includes(player.userId);
            return (
              <li
                key={player.userId}
                className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(10rem,1fr)_auto_minmax(10rem,14rem)] sm:items-center"
              >
                <label className="flex min-h-6 items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={isPlaying}
                    aria-describedby={`${id}-count`}
                    onChange={(e) => {
                      setSaved(false);
                      setPlaying((prev) =>
                        e.target.checked
                          ? [...prev, player.userId]
                          : prev.filter((u) => u !== player.userId),
                      );
                    }}
                  />
                  {player.name}
                </label>

                <div className="flex flex-wrap items-center gap-3 ps-7 sm:ps-0">
                  {isTeams ? (
                    <select
                      className="select w-auto"
                      aria-label={t('teamOf', { name: player.name })}
                      disabled={!isPlaying}
                      value={teamBy[player.userId] ?? 1}
                      onChange={(e) =>
                        setTeamBy((prev) => ({ ...prev, [player.userId]: Number(e.target.value) }))
                      }
                    >
                      {Array.from({ length: teamCount }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {t('teamName', { number: i + 1 })}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <label className="flex min-h-6 items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`${id}-winner`}
                        aria-label={`${t('result.win')}: ${player.name}`}
                        disabled={!isPlaying || isDraw}
                        checked={winner === player.userId}
                        onChange={() => setWinner(player.userId)}
                      />
                      {t('result.win')}
                    </label>
                  )}
                </div>

                <div className="ps-7 sm:ps-0">
                  {player.decks.length > 0 ? (
                    <select
                      className="select"
                      aria-label={t('deckOf', { name: player.name })}
                      disabled={!isPlaying}
                      value={deckBy[player.userId] ?? ''}
                      onChange={(e) =>
                        setDeckBy((prev) => ({ ...prev, [player.userId]: e.target.value }))
                      }
                    >
                      <option value="">{t('deck')}: —</option>
                      {player.decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted text-sm">{t('noDeck')}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {isTeams && (
        <fieldset>
          <legend className="label">{t('winningTeam')}</legend>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: teamCount }, (_, i) => {
              const team = i + 1;
              const names = ordered
                .filter((p) => (teamBy[p.userId] ?? 1) === team)
                .map((p) => p.name);
              return (
                <label key={team} className="flex min-h-6 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${id}-team`}
                    disabled={isDraw}
                    checked={winningTeam === team}
                    onChange={() => setWinningTeam(team)}
                  />
                  {t('teamName', { number: team })}
                  {names.length > 0 && <span className="muted">({names.join(', ')})</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDraw} onChange={(e) => setIsDraw(e.target.checked)} />
        {t('isDraw')}
      </label>

      <details
        className="rounded-xl border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        open={Boolean(initial?.winningTurn || initial?.firstPlayerId || initial?.durationMinutes)}
      >
        <summary className="cursor-pointer py-1 font-medium">{t('details')}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor={`${id}-first`}>
              {t('firstPlayer')}
            </label>
            <select
              id={`${id}-first`}
              className="select"
              value={playing.includes(firstPlayerId) ? firstPlayerId : ''}
              onChange={(e) => setFirstPlayerId(e.target.value)}
            >
              <option value="">—</option>
              {ordered.map((p) => (
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
              value={winningTurn}
              onChange={(e) => setWinningTurn(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`${id}-duration`}>
              {t('duration')}
            </label>
            <input
              id={`${id}-duration`}
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        {showElimination && (
          <fieldset className="mt-4">
            <legend className="label">{t('eliminatedOrder')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {ordered
                .filter((p) => isDraw || p.userId !== winner)
                .map((p) => (
                  <div key={p.userId} className="flex items-center gap-2">
                    <label className="min-w-24 text-sm" htmlFor={`${id}-out-${p.userId}`}>
                      {p.name}
                    </label>
                    <select
                      id={`${id}-out-${p.userId}`}
                      className="select"
                      value={eliminatedBy[p.userId] ?? ''}
                      onChange={(e) =>
                        setEliminatedBy((prev) => ({ ...prev, [p.userId]: e.target.value }))
                      }
                    >
                      <option value="">{t('notEliminated')}</option>
                      {Array.from({ length: playing.length - 1 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {t('eliminatedPosition', { position: i + 1 })}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </fieldset>
        )}
      </details>

      <div>
        <label className="label" htmlFor={`${id}-notes`}>
          {t('notes')}
        </label>
        <input
          id={`${id}-notes`}
          className="input"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending || !countOk || !resultOk}>
          <Icon name={gameId ? 'save' : 'add'} />
          {gameId ? t('saveGame') : t('recordGame')}
        </button>
        {saved && !error && (
          <span role="status" className="muted">
            {t('gameSaved')}
          </span>
        )}
      </div>
      <FormError message={error} />
    </form>
  );
}
