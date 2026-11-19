'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Choices } from '../ds/choices';
import { NumberField } from '../ds/number-field';
import { Select } from '../ds/select';
import { Icon } from '../icons';
import { FormError, useApiAction } from '../use-api-action';

export interface EntrantView {
  id: string;
  name: string;
  memberIds: string[];
}

/**
 * Inscrições (enquanto abertas): "Me inscrever"; quem organiza inscreve qualquer pessoa (ou
 * dupla, no 2HG), tira inscrições (dois cliques) e começa o torneio.
 */
export function TournamentEntrants({
  tournamentId,
  entrantSize,
  entrants,
  members,
  me,
  canManage,
}: {
  tournamentId: string;
  entrantSize: number;
  entrants: EntrantView[];
  members: { userId: string; name: string }[];
  me: string;
  canManage: boolean;
}) {
  const t = useTranslations('tournaments');
  const { run, error, pending } = useApiAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const taken = new Set(entrants.flatMap((e) => e.memberIds));
  const free = members.filter((m) => !taken.has(m.userId));
  const [person, setPerson] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const add = (memberIds: string[]) =>
    run(
      () =>
        api(`/api/v1/tournaments/${tournamentId}/entrants`, {
          method: 'POST',
          body: { memberIds },
        }),
      () => {
        setPerson(null);
        setPartner(null);
      },
    );
  const iAmIn = taken.has(me);

  return (
    <div className="space-y-4">
      {entrants.length === 0 ? (
        <p className="muted">{t('noEntrants')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {entrants.map((e) => {
            const mine = e.memberIds.includes(me);
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium">{e.name}</span>
                {(canManage || mine) && (
                  <button
                    type="button"
                    className={
                      confirm === e.id
                        ? 'btn-danger border border-red-300 dark:border-red-800'
                        : 'btn-danger'
                    }
                    disabled={pending}
                    onBlur={() => setConfirm(null)}
                    onClick={() => {
                      if (confirm !== e.id) return setConfirm(e.id);
                      setConfirm(null);
                      void run(() =>
                        api(`/api/v1/tournaments/${tournamentId}/entrants/${e.id}`, {
                          method: 'DELETE',
                        }),
                      );
                    }}
                    aria-label={`${confirm === e.id ? t('removeConfirm') : t('remove')} (${t('removeOf', { name: e.name })})`}
                  >
                    <Icon name="delete" />
                    {confirm === e.id ? t('removeConfirm') : t('remove')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {entrantSize === 1 && !iAmIn && (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => void add([me])}
        >
          <Icon name="add" />
          {t('joinMe')}
        </button>
      )}

      {(canManage || entrantSize === 2) && free.length >= entrantSize && (
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label={t('addPerson')}
            value={entrantSize === 2 && !canManage ? me : person}
            disabled={entrantSize === 2 && !canManage}
            onChange={setPerson}
            placeholder="—"
            options={(entrantSize === 2 && !canManage
              ? members.filter((m) => m.userId === me)
              : free
            ).map((m) => ({ value: m.userId, label: m.name }))}
            className="min-w-48"
          />
          {entrantSize === 2 && (
            <Select
              label={t('addPartner')}
              value={partner}
              onChange={setPartner}
              placeholder="—"
              options={free
                .filter((m) => m.userId !== (canManage ? person : me))
                .map((m) => ({ value: m.userId, label: m.name }))}
              className="min-w-48"
            />
          )}
          <button
            type="button"
            className="btn-secondary"
            disabled={
              pending || (entrantSize === 1 ? !person : !partner || (canManage ? !person : iAmIn))
            }
            onClick={() =>
              void add(entrantSize === 1 ? [person!] : [canManage ? person! : me, partner!])
            }
          >
            <Icon name="add" />
            {t('addEntrant')}
          </button>
        </div>
      )}
      <FormError message={error} />
    </div>
  );
}

/** Começar, próxima rodada / encerrar e apagar (quem organiza). */
export function TournamentControls({
  tournamentId,
  status,
  canStart,
  nextStep,
  topCut,
  inTopCut,
  deletable = true,
}: {
  tournamentId: string;
  status: string;
  canStart: boolean;
  /** O que o botão faz (todas as mesas da rodada registradas); `null` = ainda não dá. */
  nextStep: 'round' | 'topCut' | 'finish' | null;
  topCut: number | null;
  /** A rodada atual já é do top cut (o botão leva à próxima fase). */
  inTopCut: boolean;
  /** No torneio de loja, apagar não aparece (o torneio é do evento). */
  deletable?: boolean;
}) {
  const t = useTranslations('tournaments');
  const router = useRouter();
  const { run, error, pending } = useApiAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-3">
      {status === 'registration' && (
        <div className="space-y-1">
          <button
            type="button"
            className="btn-primary"
            disabled={pending || !canStart}
            onClick={() =>
              void run(() => api(`/api/v1/tournaments/${tournamentId}/start`, { method: 'POST' }))
            }
          >
            <Icon name="play" />
            {t('start')}
          </button>
          <p className="muted text-sm">{t('startHint')}</p>
        </div>
      )}
      {status === 'running' && (
        <div className="space-y-1">
          <button
            type="button"
            className="btn-primary"
            disabled={pending || !nextStep}
            onClick={() =>
              void run(() => api(`/api/v1/tournaments/${tournamentId}/next`, { method: 'POST' }))
            }
          >
            <Icon
              name={nextStep === 'finish' ? 'winner' : nextStep === 'topCut' ? 'ranking' : 'next'}
            />
            {nextStep === 'finish'
              ? t('finish')
              : nextStep === 'topCut'
                ? t('startTopCut', { count: topCut ?? 0 })
                : inTopCut
                  ? t('nextStage')
                  : t('next')}
          </button>
          {!nextStep && <p className="muted text-sm">{t('nextHint')}</p>}
        </div>
      )}
      {deletable && (
        <div className="space-y-1">
          <button
            type="button"
            className={
              confirm ? 'btn-danger border border-red-300 dark:border-red-800' : 'btn-danger'
            }
            disabled={pending}
            onBlur={() => setConfirm(false)}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              setConfirm(false);
              void run(
                () => api(`/api/v1/tournaments/${tournamentId}`, { method: 'DELETE' }),
                () => router.push('/torneios'),
              );
            }}
          >
            <Icon name="delete" />
            {confirm ? t('deleteConfirm') : t('delete')}
          </button>
          <p className="muted text-sm">{t('deleteHint')}</p>
        </div>
      )}
      <FormError message={error} />
    </div>
  );
}

/**
 * Resultado de uma mesa. Pod: quem venceu (ou empate). Par: jogos vencidos por cada um e
 * empatados, até o melhor de N.
 */
export function TableResultForm({
  tournamentId,
  table,
  entrants,
  kind,
  bestOf,
  initial,
  reported,
}: {
  tournamentId: string;
  table: { id: string; number: number };
  entrants: EntrantView[];
  kind: 'pod' | 'pair';
  bestOf: number;
  initial: { gameWins: Record<string, number>; gameDraws: number };
  reported: boolean;
}) {
  const t = useTranslations('tournaments');
  const { run, error, pending } = useApiAction();
  const [status, setStatus] = useState('');
  const DRAW = '__empate__';
  const initialWinner =
    entrants.find((e) => (initial.gameWins[e.id] ?? 0) > 0)?.id ??
    (initial.gameDraws ? DRAW : null);
  const [winner, setWinner] = useState<string | null>(reported ? initialWinner : null);
  const [wins, setWins] = useState<Record<string, number | null>>(
    Object.fromEntries(entrants.map((e) => [e.id, reported ? (initial.gameWins[e.id] ?? 0) : 0])),
  );
  const [draws, setDraws] = useState<number | null>(reported ? initial.gameDraws : 0);
  const needed = Math.ceil(bestOf / 2);

  const body =
    kind === 'pod'
      ? winner === DRAW
        ? { gameWins: {}, gameDraws: 1 }
        : { gameWins: winner ? { [winner]: 1 } : {}, gameDraws: 0 }
      : {
          gameWins: Object.fromEntries(entrants.map((e) => [e.id, wins[e.id] ?? 0])),
          gameDraws: draws ?? 0,
        };
  const ready =
    kind === 'pod'
      ? winner !== null
      : Object.values(body.gameWins).some((v) => v > 0) || body.gameDraws > 0;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus('');
        void run(
          () =>
            api(`/api/v1/tournaments/${tournamentId}/tables/${table.id}`, {
              method: 'PUT',
              body,
            }),
          () => setStatus(t('resultSaved')),
        );
      }}
    >
      {kind === 'pod' ? (
        <Choices
          label={t('winnerOf', { number: table.number })}
          value={winner}
          onChange={setWinner}
          variant="cards"
          orientation="vertical"
          options={[
            ...entrants.map((e) => ({ value: e.id, label: e.name })),
            { value: DRAW, label: t('draw') },
          ]}
        />
      ) : (
        // Um campo abaixo do outro: a mesa ocupa meia largura e −/campo/+ não cabem lado a lado.
        <div className="space-y-3">
          {entrants.map((e) => (
            <NumberField
              key={e.id}
              label={t('gamesWonBy', { name: e.name })}
              value={wins[e.id] ?? 0}
              onChange={(v) => setWins((w) => ({ ...w, [e.id]: v }))}
              min={0}
              max={needed}
            />
          ))}
          {bestOf > 1 && (
            <NumberField
              label={t('gamesDrawn')}
              value={draws}
              onChange={setDraws}
              min={0}
              max={bestOf}
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending || !ready}>
          <Icon name="save" />
          {reported ? t('correct') : t('saveResult')}
          <span className="sr-only"> ({t('table', { number: table.number })})</span>
        </button>
        <p role="status" className="muted text-sm">
          {status}
        </p>
      </div>
      <FormError message={error} />
    </form>
  );
}
