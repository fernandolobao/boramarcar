'use client';

import {
  defeatReason,
  formatRules,
  rollDie,
  TABLE_COUNTERS,
  tableResult,
  type TableAction,
  type TableCounter,
  type TablePlayer,
  type TableState,
} from '@boramarcar/core';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { SEAT_COLORS, tableLayout } from './layout';

/** Toque = ±1; segurar = ±10 a cada 0,6 s (como nos contadores de mesa). */
function useHold(onStep: (delta: number) => void, sign: 1 | -1) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPointerDown: () => {
      held.current = false;
      stop();
      const repeat = () => {
        held.current = true;
        onStep(10 * sign);
        timer.current = setTimeout(repeat, 600);
      };
      timer.current = setTimeout(repeat, 500);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: () => {
      // Depois de segurar, o clique final não soma mais 1.
      if (held.current) {
        held.current = false;
        return;
      }
      onStep(sign);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

/** Soma das mudanças recentes ("+5"), que some 1,5 s depois da última. */
function useRecentDelta(value: number) {
  const [delta, setDelta] = useState(0);
  const previous = useRef(value);
  useEffect(() => {
    const change = value - previous.current;
    previous.current = value;
    if (!change) return;
    setDelta((d) => d + change);
    const timer = setTimeout(() => setDelta(0), 1500);
    return () => clearTimeout(timer);
  }, [value]);
  return delta;
}

function PlayerPanel({
  player,
  state,
  color,
  rotate,
  dispatch,
  onOpen,
}: {
  player: TablePlayer;
  state: TableState;
  color: string;
  rotate: number;
  dispatch: (a: TableAction) => void;
  onOpen: () => void;
}) {
  const t = useTranslations('table');
  const change = (delta: number) => dispatch({ type: 'life', userId: player.userId, delta });
  const minus = useHold(change, -1);
  const plus = useHold(change, 1);
  const delta = useRecentDelta(player.life);
  const reason = defeatReason(player, state.format);
  const sideways = rotate === 90 || rotate === 270;
  const maxCommander = Math.max(0, ...Object.values(player.commanderDamage));

  return (
    <section
      aria-label={t('playerArea', { name: player.name })}
      className="relative overflow-hidden"
      style={{ containerType: 'size', backgroundColor: color }}
    >
      <div
        className="absolute top-1/2 left-1/2 flex flex-col text-white"
        style={{
          width: sideways ? '100cqh' : '100cqw',
          height: sideways ? '100cqw' : '100cqh',
          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        }}
      >
        <div className="flex items-center justify-between gap-2 px-6 pt-2 text-sm font-semibold">
          <span className="truncate">
            {player.name}
            {state.monarchId === player.userId && (
              <span className="ms-1 inline-flex align-[-3px]" title={t('monarch')}>
                <Icon name="monarch" className="size-4" />
                <span className="sr-only">{t('monarch')}</span>
              </span>
            )}
            {state.firstPlayerId === player.userId && (
              <span className="ms-1 rounded bg-white/20 px-1.5 text-xs">{t('first')}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-black/25 hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-white"
            aria-label={t('openPlayer', { name: player.name })}
          >
            <Icon name="settings" className="size-5" />
          </button>
        </div>
        <div className="relative grid flex-1 grid-cols-2">
          <button
            type="button"
            {...minus}
            className="flex items-center justify-start ps-4 text-4xl font-light text-white/70 select-none hover:bg-black/10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white active:bg-black/20"
            aria-label={t('lifeDown', { name: player.name, life: player.life })}
          >
            −
          </button>
          <button
            type="button"
            {...plus}
            className="flex items-center justify-end pe-4 text-4xl font-light text-white/70 select-none hover:bg-black/10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white active:bg-black/20"
            aria-label={t('lifeUp', { name: player.name, life: player.life })}
          >
            +
          </button>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-extrabold tabular-nums leading-none"
              style={{ fontSize: 'min(32cqmin, 7rem)' }}
              aria-hidden="true"
            >
              {player.life}
            </span>
            <span
              className={`h-6 text-lg font-bold tabular-nums ${delta ? 'opacity-100' : 'opacity-0'} transition-opacity motion-reduce:transition-none`}
              aria-hidden="true"
            >
              {delta > 0 ? `+${delta}` : delta < 0 ? delta : ''}
            </span>
          </div>
        </div>
        <div
          className="flex min-h-7 flex-wrap justify-center gap-2 px-2 pb-2 text-xs font-semibold"
          aria-hidden="true"
        >
          {player.counters.poison > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-black/30 px-1.5">
              <Icon name="poison" className="size-3.5" /> {player.counters.poison}
            </span>
          )}
          {maxCommander > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-black/30 px-1.5">
              <Icon name="games" className="size-3.5" /> {maxCommander}
            </span>
          )}
          {player.counters.tax > 0 && (
            <span className="rounded bg-black/30 px-1.5">
              {t('counters.tax')} {player.counters.tax}
            </span>
          )}
        </div>
        {/* Anúncio para leitores de tela (vida e situação). */}
        <p className="sr-only" aria-live="polite">
          {t('lifeStatus', { name: player.name, life: player.life })}
          {reason ? ` ${t(`defeat.${reason}`)}` : ''}
        </p>
        {reason && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
            <span
              className="rounded-lg bg-black/70 px-3 py-1 text-sm font-semibold"
              aria-hidden="true"
            >
              {t(`defeat.${reason}`)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  const t = useTranslations('table');
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary size-10 p-0"
          aria-label={t('decrease', { label })}
          onClick={() => onChange(-1)}
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="btn-secondary size-10 p-0"
          aria-label={t('increase', { label })}
          onClick={() => onChange(1)}
        >
          +
        </button>
      </span>
    </li>
  );
}

/** Diálogo modal nativo (Esc fecha e o foco volta para quem abriu). */
function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations('table');
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[min(94vw,28rem)] overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/70 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {open && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" className="btn-secondary" onClick={() => ref.current?.close()}>
              <Icon name="close" />
              {t('close')}
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * Tabuleiro do modo mesa: uma área por jogador, virada para quem está daquele lado, e um botão
 * central com desfazer, dados, moeda, sorteio de quem começa e encerrar a partida.
 */
export function TableBoard({
  state,
  dispatch,
  onFinish,
  onExit,
}: {
  state: TableState;
  dispatch: (a: TableAction) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const t = useTranslations('table');
  const layout = tableLayout(state.players.length);
  const [playerOpen, setPlayerOpen] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roll, setRoll] = useState('');
  const usesCommander = formatRules(state.format).usesCommander;
  const selected = state.players.find((p) => p.userId === playerOpen) ?? null;
  const { winnerId } = tableResult(state);

  // Sobrou um só: abre o menu para encerrar (ajuste de estado na renderização, sem efeito).
  const [lastWinner, setLastWinner] = useState(winnerId);
  if (winnerId !== lastWinner) {
    setLastWinner(winnerId);
    if (winnerId) {
      setPlayerOpen(null);
      setMenuOpen(true);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950">
      <h1 className="sr-only">{t('title')}</h1>
      <div
        className="grid h-full w-full gap-1 p-1"
        style={{
          gridTemplateAreas: layout.areas,
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
          gridAutoRows: 'minmax(0, 1fr)',
        }}
      >
        {state.players.map((player, i) => {
          const seat = layout.seats[i]!;
          return (
            <div key={player.userId} style={{ gridArea: seat.area }} className="grid rounded-2xl">
              <PlayerPanel
                player={player}
                state={state}
                color={SEAT_COLORS[i % SEAT_COLORS.length]!}
                rotate={seat.rotate}
                dispatch={dispatch}
                onOpen={() => setPlayerOpen(player.userId)}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="absolute top-1/2 left-1/2 z-10 inline-flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-950 shadow-xl ring-4 ring-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        aria-label={t('menu')}
      >
        <Icon name="dashboard" className="size-6" />
      </button>

      <Dialog
        open={selected !== null}
        title={selected ? t('playerTitle', { name: selected.name }) : ''}
        onClose={() => setPlayerOpen(null)}
      >
        {selected && (
          <>
            {usesCommander && (
              <section>
                <h3 className="font-semibold">{t('commanderDamage')}</h3>
                <p className="muted text-sm">{t('commanderDamageHint')}</p>
                <ul>
                  {state.players
                    .filter((p) => p.userId !== selected.userId)
                    .map((p) => (
                      <Stepper
                        key={p.userId}
                        label={t('from', { name: p.name })}
                        value={selected.commanderDamage[p.userId] ?? 0}
                        onChange={(delta) =>
                          dispatch({
                            type: 'commander',
                            userId: selected.userId,
                            fromUserId: p.userId,
                            delta,
                          })
                        }
                      />
                    ))}
                </ul>
              </section>
            )}
            <section>
              <h3 className="font-semibold">{t('countersTitle')}</h3>
              <ul>
                {TABLE_COUNTERS.filter((c) => c !== 'tax' || usesCommander).map(
                  (c: TableCounter) => (
                    <Stepper
                      key={c}
                      label={t(`counters.${c}`)}
                      value={selected.counters[c]}
                      onChange={(delta) =>
                        dispatch({ type: 'counter', userId: selected.userId, counter: c, delta })
                      }
                    />
                  ),
                )}
              </ul>
            </section>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={state.monarchId === selected.userId ? 'btn-primary' : 'btn-secondary'}
                aria-pressed={state.monarchId === selected.userId}
                onClick={() =>
                  dispatch({
                    type: 'monarch',
                    userId: state.monarchId === selected.userId ? null : selected.userId,
                  })
                }
              >
                <Icon name="monarch" />
                {t('monarch')}
              </button>
              <button
                type="button"
                className={selected.conceded ? 'btn-primary' : 'btn-secondary'}
                aria-pressed={selected.conceded}
                onClick={() =>
                  dispatch({
                    type: 'concede',
                    userId: selected.userId,
                    conceded: !selected.conceded,
                  })
                }
              >
                {t('concede')}
              </button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={menuOpen} title={t('menu')} onClose={() => setMenuOpen(false)}>
        {winnerId && (
          <p
            role="status"
            className="rounded-xl bg-green-50 p-3 text-green-800 dark:bg-green-950 dark:text-green-300"
          >
            {t('winnerFound', { name: state.players.find((p) => p.userId === winnerId)!.name })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={state.undo.length === 0}
            onClick={() => dispatch({ type: 'undo' })}
          >
            <Icon name="undo" />
            {t('undo')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRoll(t('rolled', { value: rollDie(20) }))}
          >
            {t('rollD20')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRoll(rollDie(2) === 1 ? t('heads') : t('tails'))}
          >
            {t('flipCoin')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const p = state.players[rollDie(state.players.length) - 1]!;
              dispatch({ type: 'first', userId: p.userId });
              setRoll(t('firstIs', { name: p.name }));
            }}
          >
            {t('pickFirst')}
          </button>
        </div>
        <p role="status" className="min-h-6 text-center text-lg font-semibold">
          {roll}
        </p>
        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" className="btn-primary" onClick={onFinish}>
            <Icon name="finish" />
            {t('finish')}
          </button>
          <button type="button" className="btn-secondary" onClick={onExit}>
            <Icon name="previous" />
            {t('exit')}
          </button>
        </div>
        <p className="muted text-sm">{t('exitHint')}</p>
      </Dialog>
    </div>
  );
}
