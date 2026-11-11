'use client';

import type { CardRole } from '@boramarcar/core';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Icon } from './icons';
import { ManaCost } from './mana';
import { FormError, useApiAction } from './use-api-action';
import { CardNames } from './card-dialog';

interface Alternative {
  name: string;
  manaCost: string | null;
  typeLine: string;
  imageUri: string | null;
  priceUsd: string | null;
  gameChanger: boolean;
}

/** Botão "Atualizar análise" (Tagger + Spellbook) com o resultado anunciado. */
export function RefreshAnalysis({ deckId, stale }: { deckId: string; stale: boolean }) {
  const t = useTranslations('analysis');
  const { run, error, pending } = useApiAction();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <div className="space-y-2">
      {stale && !message && <p className="muted text-sm">{t('stale')}</p>}
      <button
        type="button"
        className="btn-secondary"
        disabled={busy || pending}
        onClick={() => {
          setBusy(true);
          setMessage('');
          void run(
            () => api<{ errors: string[] }>(`/api/v1/decks/${deckId}/analysis`, { method: 'POST' }),
            (r) =>
              setMessage(
                r.errors.length
                  ? t('refreshPartial', { services: r.errors.join(', ') })
                  : t('refreshed'),
              ),
          ).finally(() => setBusy(false));
        }}
      >
        <Icon
          name="refresh"
          className={`size-4 shrink-0 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`}
        />
        {busy ? t('refreshing') : t('refresh')}
      </button>
      <p role="status" className="text-sm">
        {!error && message}
      </p>
      <FormError message={error} />
    </div>
  );
}

function RoleAlternatives({ deckId, role }: { deckId: string; role: CardRole }) {
  const t = useTranslations('analysis');
  const te = useTranslations('errors');
  const tc = useTranslations('common');
  const id = useId();
  const [maxCmc, setMaxCmc] = useState(3);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'done'; query: string; cards: Alternative[] }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const open = state.kind !== 'idle';

  const load = (cmc: number) => {
    setState({ kind: 'loading' });
    api<{ query: string; cards: Alternative[] }>(
      `/api/v1/decks/${deckId}/alternatives?role=${role}&maxCmc=${cmc}`,
    )
      .then((r) => setState({ kind: 'done', ...r }))
      .catch((e: unknown) =>
        setState({
          kind: 'error',
          message:
            e instanceof ApiError && e.code === 'upstream_error'
              ? t('alternativesError')
              : te('internal_error'),
        }),
      );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm" htmlFor={`${id}-cmc`}>
          {t('maxCmc')}
          <span className="sr-only"> ({t(`roles.${role}`)})</span>
        </label>
        <select
          id={`${id}-cmc`}
          className="select w-20 py-1.5"
          value={maxCmc}
          onChange={(e) => {
            const value = Number(e.target.value);
            setMaxCmc(value);
            if (open) load(value);
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary py-1.5"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-label={`${open ? t('hideAlternatives') : t('alternatives')} (${t(`roles.${role}`)})`}
          onClick={() => (open ? setState({ kind: 'idle' }) : load(maxCmc))}
        >
          <Icon name="alternatives" />
          {open ? t('hideAlternatives') : t('alternatives')}
        </button>
      </div>
      <div id={`${id}-list`} hidden={!open} aria-live="polite" className="space-y-2">
        {state.kind === 'loading' && <p className="muted text-sm">{t('loadingAlternatives')}</p>}
        {state.kind === 'error' && <FormError message={state.message} />}
        {state.kind === 'done' && (
          <>
            <h4 className="text-sm font-semibold">
              {t('alternativesTitle', { role: t(`roles.${role}`), maxCmc })}
            </h4>
            <p className="muted text-xs">{t('alternativesHint')}</p>
            {state.cards.length === 0 ? (
              <p className="text-sm">{t('noAlternatives')}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {state.cards.map((card) => (
                  <li key={card.name} className="space-y-1">
                    {card.imageUri && (
                      <div className="relative aspect-[488/680] overflow-hidden rounded-[4.5%/3.2%] bg-ink-200 dark:bg-ink-800">
                        <Image
                          src={card.imageUri}
                          alt=""
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 12rem, 45vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <p className="flex flex-wrap items-center gap-1 text-sm font-medium">
                      {card.name}
                      {card.manaCost && <ManaCost cost={card.manaCost} />}
                    </p>
                    {card.gameChanger && <p className="muted text-xs">Game Changer</p>}
                  </li>
                ))}
              </ul>
            )}
            <a
              className="inline-flex items-center gap-1 text-sm text-brand-700 underline dark:text-brand-300"
              href={`https://scryfall.com/search?q=${encodeURIComponent(state.query)}&order=edhrec`}
              target="_blank"
              rel="noreferrer"
            >
              {t('moreOnScryfall')}
              <Icon name="externalLink" className="size-3.5 shrink-0" />
              <span className="sr-only">
                {' '}
                ({t(`roles.${role}`)}) {tc('newTab')}
              </span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/** Funções das cartas (4.5) com as alternativas de cada uma (4.6). */
export function DeckRoles({
  deckId,
  roles,
  cardsByRole,
  targets,
  tagged,
}: {
  deckId: string;
  roles: Record<CardRole, number>;
  cardsByRole: Record<CardRole, string[]>;
  targets: Partial<Record<CardRole, number>> | null;
  tagged: { tagged: number; total: number };
}) {
  const t = useTranslations('analysis');
  const keys = Object.keys(roles) as CardRole[];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="section-title mb-1">{t('rolesTitle')}</h2>
        <p className="muted text-sm">{t('rolesHint')}</p>
        <p className="muted text-sm">
          {t('rolesSource', { tagged: tagged.tagged, total: tagged.total })}
        </p>
      </div>
      <ul className="grid gap-x-8 lg:grid-cols-2">
        {keys.map((role) => {
          const target = targets?.[role];
          const low = target !== undefined && roles[role] < target;
          return (
            <li
              key={role}
              className="space-y-2 border-t border-ink-200 py-3 lg:has-[[aria-expanded=true]]:col-span-2 dark:border-ink-800"
            >
              <h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                {t(`roles.${role}`)}
                <span className="text-sm font-normal">
                  {t('roleCount', { count: roles[role] })}
                  {target !== undefined && (
                    <span
                      className={`ms-2 inline-flex items-center gap-1 ${low ? 'text-amber-800 dark:text-amber-300' : 'muted'}`}
                    >
                      {low && <Icon name="warning" className="size-3.5 shrink-0" />}
                      {t('roleTarget', { target })}
                    </span>
                  )}
                </span>
              </h3>
              {cardsByRole[role].length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer py-1">
                    {t('roleCards')}
                    <span className="sr-only"> ({t(`roles.${role}`)})</span>
                  </summary>
                  <p className="mt-1">
                    <CardNames names={[...new Set(cardsByRole[role])]} />
                  </p>
                </details>
              )}
              <RoleAlternatives deckId={deckId} role={role} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
